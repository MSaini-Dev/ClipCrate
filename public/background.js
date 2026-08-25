// background.js

chrome.action.onClicked.addListener(async (tab) => {
  console.log("Extension icon clicked for tab:", tab.id);

  try {
    // Ask the PAGE itself what state it's in, every single time - never
    // trust in-memory bookkeeping here. MV3 service workers get killed and
    // respawned constantly (~30s idle), which wipes any in-memory Set. If
    // we'd instead trusted a Set to know whether content.js was already
    // injected, a respawned worker forgets that and re-injects the whole
    // bundle into a page that's already running it, which crashes with
    // "Identifier '...' has already been declared" on the bundle's
    // top-level consts. Checking the live DOM/window state sidesteps that
    // entirely, since it doesn't depend on the service worker remembering
    // anything across restarts.
    let state = { uiExists: false, scriptLoaded: false };
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => ({
          uiExists: document.getElementById("my-extension-root") !== null,
          scriptLoaded: typeof window.createExtensionUI === "function",
        }),
      });
      state = results[0]?.result || state;
      console.log("Page state:", state);
    } catch (checkError) {
      console.log("Page state check failed (probably no scripts injected yet):", checkError.message);
    }

    if (state.uiExists) {
      console.log("Extension UI already exists in this tab - skipping");
      return;
    }

    if (state.scriptLoaded) {
      // The bundle already ran on this page before (e.g. the user closed
      // the UI, which just removes #my-extension-root) - re-invoke the
      // create function instead of re-injecting content.js, which would
      // redeclare its top-level consts and crash.
      console.log("Script already loaded on this page, re-invoking createExtensionUI...");
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          if (window.createExtensionUI) window.createExtensionUI();
        },
      });
      return;
    }

    // First time on this page - inject CSS + the bundle. index.jsx calls
    // window.createExtensionUI() itself at the bottom, so nothing further
    // is needed here.
    console.log("Injecting CSS + content script for the first time on this tab...");
    await chrome.scripting.insertCSS({
      target: { tabId: tab.id },
      files: ["contentStyle.css"],
    });
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content.js"],
    });
    console.log("Extension injected successfully");
  } catch (error) {
    console.error("Failed to inject extension:", error);
  }
});

// Handle storage requests
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getStorage") {
    chrome.storage.local.get(request.key, (result) => {
      sendResponse({ [request.key]: result[request.key] });
    });
    return true; // Required to use sendResponse asynchronously
  } else if (request.action === "setStorage") {
    chrome.storage.local.set(request.data, () => {
      sendResponse({ success: true });
    });
    return true;
  } else if (request.action === "callAiProvider") {
    callAiProvider(request.payload).then(sendResponse);
    return true; // async sendResponse
  }
});

// Performs the actual OpenAI-compatible chat completion call. This has to
// live in the background service worker (not the content-script-injected
// popup) because only extension contexts get cross-origin fetch privileges
// via host_permissions - a fetch from the injected page context is bound
// by that host page's CORS policy and will be blocked by most providers.
// Ported from _http_provider.py's 429 handling: a flat "wait 60s and retry"
// is wrong for a daily-quota exhaustion (e.g. Gemini's free tier resets
// once a day, not once a minute) - retrying every 60s just burns the
// failover budget hammering a key that won't work again for hours. This
// sniffs the error body for hints and picks a cooldown that actually
// matches what happened.
function classify429(providerLabel, headers, bodyText) {
  const headerRetry = parseInt(headers.get("Retry-After"), 10);
  let retryAfter = Number.isFinite(headerRetry) ? headerRetry : 60;

  const bodyLower = (bodyText || "").toLowerCase();
  const minuteHint = ["per minute", "rpm", "tpm"].some((t) => bodyLower.includes(t));
  const dayHint = ["per day", "daily", "quota", "day limit"].some((t) => bodyLower.includes(t));
  const label = (providerLabel || "").toLowerCase();

  const isDailyQuota = (label === "gemini" && !minuteHint) || (dayHint && !minuteHint);
  if (isDailyQuota) {
    retryAfter = Math.max(retryAfter, 86400);
    return {
      error: `${providerLabel || "Provider"} daily quota exceeded (429)`,
      retryAfter,
    };
  }
  return { error: "Rate limit exceeded (429)", retryAfter };
}

async function callAiProvider({ baseUrl, apiKey, model, messages, timeoutMs = 30000, providerLabel = "provider" }) {
  const url = `${baseUrl.replace(/\/+$/, "")}/chat/completions`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
        max_tokens: 4096,
      }),
      signal: controller.signal,
    });

    if (response.status === 200) {
      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content;
      if (typeof content !== "string") {
        return { success: false, error: "Unexpected response format from provider" };
      }
      return { success: true, response: content };
    }

    const bodyText = await response.text().catch(() => "");
    if (response.status === 429) {
      const { error, retryAfter } = classify429(providerLabel, response.headers, bodyText);
      return { success: false, error, code: 429, retryAfter };
    }
    if (response.status === 401 || response.status === 403) {
      return { success: false, error: `Invalid API key (${response.status})`, code: response.status };
    }
    if ([500, 502, 503, 504].includes(response.status)) {
      return { success: false, error: `Provider server error (${response.status})`, code: response.status };
    }
    return { success: false, error: `HTTP ${response.status} — ${bodyText.slice(0, 200)}`, code: response.status };
  } catch (err) {
    if (err.name === "AbortError") {
      return { success: false, error: "Request timed out", code: 408 };
    }
    return { success: false, error: `Connection failed: ${err.message}` };
  } finally {
    clearTimeout(timer);
  }
}
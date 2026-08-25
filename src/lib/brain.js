// src/lib/brain.js
// A JS port of call_api.py / selector.py's failover behavior, since browser
// extensions can't run the Python Brain package directly. Same idea: walk
// through the user's configured (provider, model, key) combinations, skip
// ones on cooldown, disable keys that come back invalid, cool down keys
// that get rate-limited, and return on the first success.

// In-memory only (per popup session) - mirrors RateLimitHandler's cooldown
// behavior without needing to persist it across reloads.
const cooldowns = new Map(); // `${providerId}:${keyId}` -> epoch ms until active again

function cooldownKey(providerId, keyId) {
  return `${providerId}:${keyId}`;
}

function isOnCooldown(providerId, keyId) {
  const until = cooldowns.get(cooldownKey(providerId, keyId));
  return typeof until === "number" && Date.now() < until;
}

function setCooldown(providerId, keyId, seconds) {
  cooldowns.set(cooldownKey(providerId, keyId), Date.now() + seconds * 1000);
}

// Flattens providers -> candidate (provider, model, key) triples, in order,
// skipping disabled models/keys and anything currently cooling down.
function buildCandidates(providers) {
  const candidates = [];
  for (const provider of providers || []) {
    const activeModels = (provider.models || []).filter((m) => m.status !== "disabled");
    const activeKeys = (provider.apiKeys || []).filter((k) => k.status !== "disabled");
    if (!activeModels.length || !activeKeys.length) continue;

    for (const model of activeModels) {
      for (const key of activeKeys) {
        if (isOnCooldown(provider.id, key.id)) continue;
        candidates.push({ provider, model, key });
      }
    }
  }
  return candidates;
}

async function callOpenAiCompatible(baseUrl, apiKey, model, messages, { timeoutMs = 30000 } = {}) {
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
      const retryAfter = parseInt(response.headers.get("Retry-After"), 10);
      return {
        success: false,
        error: "Rate limit exceeded (429)",
        code: 429,
        retryAfter: Number.isFinite(retryAfter) ? retryAfter : 60,
      };
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

/**
 * Try the user's configured providers/models/keys in order until one
 * succeeds. `onKeyDisabled` is called (providerId, keyId) so the caller can
 * persist that back to storage, same as store.disable_api() server-side.
 */
export async function runBrain({ providers, systemPrompt, messages, onKeyDisabled }) {
  const candidates = buildCandidates(providers);

  if (candidates.length === 0) {
    return {
      success: false,
      error:
        "No AI provider is configured yet. Open Settings → AI Services and add a base URL, API key, and model.",
    };
  }

  const chatMessages = [{ role: "system", content: systemPrompt }, ...messages];

  let lastError = "All configured providers failed.";
  for (const { provider, model, key } of candidates) {
    const result = await callOpenAiCompatible(provider.baseUrl, key.value, model.name, chatMessages);

    if (result.success) {
      return { success: true, response: result.response, providerName: provider.name, modelName: model.name };
    }

    lastError = result.error;

    if (result.code === 401 || result.code === 403) {
      if (typeof onKeyDisabled === "function") {
        onKeyDisabled(provider.id, key.id);
      }
      continue;
    }
    if (result.code === 429) {
      setCooldown(provider.id, key.id, result.retryAfter || 60);
      continue;
    }
    // server_error / timeout / network / unknown - just move to the next candidate
  }

  return { success: false, error: lastError };
}
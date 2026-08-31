// src/lib/brain.js
// Minimal stub – replace with your real multi-provider AI caller.
// Expected signature used by AiChatView:
//   runBrain({ providers, systemPrompt, messages, onKeyDisabled })
//   → { success: boolean, response?: string, error?: string }

export async function runBrain({ providers, systemPrompt, messages, onKeyDisabled }) {
  // Find first provider that has at least one active key and one active model
  const usable = (providers || []).find(
    (p) =>
      p.apiKeys?.some((k) => k.status === "active") &&
      p.models?.some((m) => m.status === "active")
  );

  if (!usable) {
    return {
      success: false,
      error:
        "No AI provider configured. Open Settings → AI Services and add a base URL, API key and model.",
    };
  }

  const key = usable.apiKeys.find((k) => k.status === "active");
  const model = usable.models.find((m) => m.status === "active");

  try {
    const res = await fetch(`${usable.baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key.value}`,
      },
      body: JSON.stringify({
        model: model.name,
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        temperature: 0.7,
      }),
    });

    if (res.status === 401 || res.status === 403) {
      onKeyDisabled?.(usable.id, key.id);
      return { success: false, error: "API key rejected by the provider." };
    }

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return {
        success: false,
        error: `Provider error ${res.status}: ${text.slice(0, 120)}`,
      };
    }

    const data = await res.json();
    const content =
      data?.choices?.[0]?.message?.content ||
      data?.choices?.[0]?.text ||
      "";

    if (!content) {
      return { success: false, error: "Empty response from provider." };
    }

    return { success: true, response: content };
  } catch (err) {
    return {
      success: false,
      error: err.message || "Network error talking to the AI provider.",
    };
  }
}

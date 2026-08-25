// src/lib/aiProviders.js
// Persists the user's own AI provider configs (base URL + API keys + models)
// so the extension can call the user's chosen provider directly, instead of
// a fixed hardcoded backend. Mirrors the shape api_data.json/data_store.py
// used server-side, just scoped to what the client needs.

const STORAGE_KEY = "clipcrate_ai_providers";

const hasChromeStorage =
  typeof chrome !== "undefined" && chrome.storage && chrome.storage.local;

function uid(prefix = "id") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function defaultProviders() {
  return [
    {
      id: uid("provider"),
      name: "GROQ",
      baseUrl: "https://api.groq.com/openai/v1",
      apiKeys: [],
      models: [],
      builtIn: true,
    },
    {
      id: uid("provider"),
      name: "CEREBRAS",
      baseUrl: "https://api.cerebras.ai/v1",
      apiKeys: [],
      models: [],
      builtIn: true,
    },
  ];
}

function readRaw() {
  return new Promise((resolve) => {
    if (hasChromeStorage) {
      chrome.storage.local.get([STORAGE_KEY], (result) => {
        resolve(result?.[STORAGE_KEY] ?? null);
      });
    } else {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        resolve(raw ? JSON.parse(raw) : null);
      } catch {
        resolve(null);
      }
    }
  });
}

function writeRaw(value) {
  return new Promise((resolve) => {
    if (hasChromeStorage) {
      chrome.storage.local.set({ [STORAGE_KEY]: value }, () => resolve());
    } else {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
      } catch {
        // ignore quota/serialization errors, same as the rest of the app
      }
      resolve();
    }
  });
}

// Loads providers, seeding sane defaults (empty Groq/Cerebras shells - no
// keys baked in, this is bring-your-own-key) the first time.
export async function getAiProviders(setter) {
  let providers = await readRaw();
  if (!providers || !Array.isArray(providers) || providers.length === 0) {
    providers = defaultProviders();
    await writeRaw(providers);
  }
  setter(providers);
  return providers;
}

export async function saveAiProviders(providers) {
  await writeRaw(providers);
  return providers;
}

export function newProviderId() {
  return uid("provider");
}
export function newKeyId() {
  return uid("key");
}
export function newModelId() {
  return uid("model");
}
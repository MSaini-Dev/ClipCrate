// src/lib/aiProviders.js
// AI provider config (base URL, keys, models) is stored in BOTH
// chrome.storage.local (fast) and chrome.storage.sync (same Google account).
// It is intentionally NOT included in JSON export/import.

const STORAGE_KEY = "aiProviders";

function hasChromeStorage() {
  return typeof chrome !== "undefined" && chrome.storage;
}

export function newProviderId() {
  return `provider_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function newKeyId() {
  return `key_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function newModelId() {
  return `model_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/** Load providers. Prefers local, falls back to sync. */
export function getAiProviders(setProviders) {
  if (!hasChromeStorage()) {
    setProviders([]);
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    chrome.storage.local.get([STORAGE_KEY], (local) => {
      if (Array.isArray(local[STORAGE_KEY]) && local[STORAGE_KEY].length) {
        setProviders(local[STORAGE_KEY]);
        resolve();
        return;
      }
      // Nothing local → try sync (new device / reinstall)
      chrome.storage.sync.get([STORAGE_KEY], (synced) => {
        const list = Array.isArray(synced[STORAGE_KEY]) ? synced[STORAGE_KEY] : [];
        setProviders(list);
        if (list.length) {
          chrome.storage.local.set({ [STORAGE_KEY]: list });
        }
        resolve();
      });
    });
  });
}

/** Persist to local + sync so the same Google account gets the keys. */
export function saveAiProviders(providers) {
  if (!hasChromeStorage()) return;
  const safe = Array.isArray(providers) ? providers : [];
  chrome.storage.local.set({ [STORAGE_KEY]: safe });
  try {
    chrome.storage.sync.set({ [STORAGE_KEY]: safe });
  } catch (_) {
    // Quota or other sync error – local still has the data
  }
}

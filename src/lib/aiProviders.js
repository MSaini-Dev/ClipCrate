// src/lib/aiProviders.js
// Simple helpers for AI provider configuration stored in chrome.storage.local

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

export function getAiProviders(setProviders) {
  if (!hasChromeStorage()) {
    setProviders([]);
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    chrome.storage.local.get([STORAGE_KEY], (result) => {
      const list = Array.isArray(result[STORAGE_KEY]) ? result[STORAGE_KEY] : [];
      setProviders(list);
      resolve();
    });
  });
}

export function saveAiProviders(providers) {
  if (!hasChromeStorage()) return;
  chrome.storage.local.set({ [STORAGE_KEY]: Array.isArray(providers) ? providers : [] });
}

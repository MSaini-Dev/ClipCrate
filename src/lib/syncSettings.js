// src/lib/syncSettings.js
// Global cloud-sync preferences stored in chrome.storage.local only.

const KEYS = {
  cloudBlocked: "clipcrate_cloud_blocked",
  chromeSyncIncludeAi: "clipcrate_chrome_sync_include_ai",
  firebaseMode: "clipcrate_firebase_mode", // "default" | "custom"
  firebaseCustomConfig: "clipcrate_firebase_custom_config",
};

function hasChrome() {
  return typeof chrome !== "undefined" && chrome.storage && chrome.storage.local;
}

function get(keys) {
  return new Promise((resolve) => {
    if (!hasChrome()) {
      resolve({});
      return;
    }
    chrome.storage.local.get(keys, (result) => resolve(result || {}));
  });
}

function set(obj) {
  return new Promise((resolve) => {
    if (!hasChrome()) {
      resolve();
      return;
    }
    chrome.storage.local.set(obj, () => resolve());
  });
}

/** When true, Chrome sync + Firebase are fully disabled. */
export async function isCloudBlocked() {
  const r = await get([KEYS.cloudBlocked]);
  return !!r[KEYS.cloudBlocked];
}

export async function setCloudBlocked(blocked) {
  await set({ [KEYS.cloudBlocked]: !!blocked });
}

/** Whether Chrome storage.sync should also carry AI credentials. */
export async function getChromeSyncIncludeAi() {
  const r = await get([KEYS.chromeSyncIncludeAi]);
  return !!r[KEYS.chromeSyncIncludeAi];
}

export async function setChromeSyncIncludeAi(include) {
  await set({ [KEYS.chromeSyncIncludeAi]: !!include });
}

/** "default" = built-in ClipCrate Firebase project, "custom" = user config. */
export async function getFirebaseMode() {
  const r = await get([KEYS.firebaseMode]);
  return r[KEYS.firebaseMode] === "custom" ? "custom" : "default";
}

export async function setFirebaseMode(mode) {
  await set({ [KEYS.firebaseMode]: mode === "custom" ? "custom" : "default" });
}

export async function getFirebaseCustomConfig() {
  const r = await get([KEYS.firebaseCustomConfig]);
  return r[KEYS.firebaseCustomConfig] || null;
}

export async function setFirebaseCustomConfig(config) {
  await set({ [KEYS.firebaseCustomConfig]: config || null });
}

export { KEYS };

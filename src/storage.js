// src/storage.js
// Local = fast reads/writes for the current session.
// Sync  = chrome.storage.sync so the same Google account gets the data
//         automatically on other devices (Chrome only, ~100 KB limit).

const LOCAL_SLOTS_KEY = "slots";
const LOCAL_PALETTES_KEY = "colorPalettes";
const SYNC_SLOTS_KEY = "slots";
const SYNC_PALETTES_KEY = "colorPalettes";

function hasChromeStorage() {
  return typeof chrome !== "undefined" && chrome.storage;
}

/** Load slots. Prefers local, falls back to sync. */
export function getSlots(setSlots) {
  if (!hasChromeStorage()) {
    setSlots([]);
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    chrome.storage.local.get([LOCAL_SLOTS_KEY], (local) => {
      if (Array.isArray(local[LOCAL_SLOTS_KEY]) && local[LOCAL_SLOTS_KEY].length) {
        setSlots(local[LOCAL_SLOTS_KEY]);
        resolve();
        return;
      }
      // Nothing local → try sync (first install on a new device)
      chrome.storage.sync.get([SYNC_SLOTS_KEY], (synced) => {
        const data = Array.isArray(synced[SYNC_SLOTS_KEY]) ? synced[SYNC_SLOTS_KEY] : [];
        setSlots(data);
        // Seed local so subsequent reads are fast
        if (data.length) {
          chrome.storage.local.set({ [LOCAL_SLOTS_KEY]: data });
        }
        resolve();
      });
    });
  });
}

/** Load palettes. Prefers local, falls back to sync. */
export function getColorPalettes(setColorPalettes) {
  if (!hasChromeStorage()) {
    setColorPalettes([]);
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    chrome.storage.local.get([LOCAL_PALETTES_KEY], (local) => {
      if (Array.isArray(local[LOCAL_PALETTES_KEY]) && local[LOCAL_PALETTES_KEY].length) {
        setColorPalettes(local[LOCAL_PALETTES_KEY]);
        resolve();
        return;
      }
      chrome.storage.sync.get([SYNC_PALETTES_KEY], (synced) => {
        const data = Array.isArray(synced[SYNC_PALETTES_KEY]) ? synced[SYNC_PALETTES_KEY] : [];
        setColorPalettes(data);
        if (data.length) {
          chrome.storage.local.set({ [LOCAL_PALETTES_KEY]: data });
        }
        resolve();
      });
    });
  });
}

/** Persist slots to both local and sync. */
export function saveSlots(slots) {
  if (!hasChromeStorage()) return;
  const safe = Array.isArray(slots) ? slots : [];
  chrome.storage.local.set({ [LOCAL_SLOTS_KEY]: safe });
  // Fire-and-forget sync; ignore quota errors silently
  try {
    chrome.storage.sync.set({ [SYNC_SLOTS_KEY]: safe });
  } catch (_) {}
}

/** Persist palettes to both local and sync. */
export function saveColorPalettes(colorPalettes) {
  if (!hasChromeStorage()) return;
  const safe = Array.isArray(colorPalettes) ? colorPalettes : [];
  chrome.storage.local.set({ [LOCAL_PALETTES_KEY]: safe });
  try {
    chrome.storage.sync.set({ [SYNC_PALETTES_KEY]: safe });
  } catch (_) {}
}

/**
 * Force a full replace from sync (used by “Pull from other devices”
 * button if the user wants an explicit refresh).
 */
export function pullFromSync() {
  if (!hasChromeStorage()) {
    return Promise.resolve({ slots: [], colorPalettes: [] });
  }
  return new Promise((resolve) => {
    chrome.storage.sync.get([SYNC_SLOTS_KEY, SYNC_PALETTES_KEY], (synced) => {
      const slots = Array.isArray(synced[SYNC_SLOTS_KEY]) ? synced[SYNC_SLOTS_KEY] : [];
      const colorPalettes = Array.isArray(synced[SYNC_PALETTES_KEY])
        ? synced[SYNC_PALETTES_KEY]
        : [];
      chrome.storage.local.set({
        [LOCAL_SLOTS_KEY]: slots,
        [LOCAL_PALETTES_KEY]: colorPalettes,
      });
      resolve({ slots, colorPalettes });
    });
  });
}

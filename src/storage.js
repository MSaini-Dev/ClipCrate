// storage.js
export function getColorPalettes(setState) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { action: "getStorage", key: "colorPalettes" },
      (response) => {
        if (chrome.runtime.lastError) {
          setState([]);
          resolve([]);
          return;
        }
        const palettes = response.colorPalettes || [];
        setState(palettes);
        resolve(palettes);
      }
    );
  });
}

export function getSlots(setState) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { action: "getStorage", key: "slots" },
      (response) => {
        if (chrome.runtime.lastError) {
          setState([]);
          resolve([]);
          return;
        }
        const slots = response.slots || [];
        setState(slots);
        resolve(slots);
      }
    );
  });
}

export function saveColorPalettes(palettes, callback) {
  chrome.runtime.sendMessage(
    { action: "setStorage", data: { colorPalettes: palettes } },
    (response) => {
      callback?.(response);
    }
  );
}

export function saveSlots(slots, callback) {
  chrome.runtime.sendMessage(
    { action: "setStorage", data: { slots } },
    (response) => {
      callback?.(response);
    }
  );
}
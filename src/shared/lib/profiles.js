// Profile system: isolated slots, palettes, and AI credentials per profile.
const KEYS = {
  profiles: "clipcrate_profiles",
  activeId: "clipcrate_active_profile",
};

function hasChrome() {
  return typeof chrome !== "undefined" && chrome.storage?.local;
}

function uid(prefix = "profile") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function emptyProfile(name = "Default") {
  return {
    id: uid(),
    name,
    slots: [],
    colorPalettes: [],
    aiProviders: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

async function read() {
  return new Promise((resolve) => {
    if (!hasChrome()) {
      resolve({ profiles: [], activeId: null });
      return;
    }
    chrome.storage.local.get([KEYS.profiles, KEYS.activeId], (r) => {
      resolve({
        profiles: Array.isArray(r[KEYS.profiles]) ? r[KEYS.profiles] : [],
        activeId: r[KEYS.activeId] || null,
      });
    });
  });
}

async function write(profiles, activeId) {
  return new Promise((resolve) => {
    if (!hasChrome()) {
      resolve();
      return;
    }
    chrome.storage.local.set(
      { [KEYS.profiles]: profiles, [KEYS.activeId]: activeId },
      () => resolve()
    );
  });
}

export async function ensureProfiles() {
  let { profiles, activeId } = await read();
  if (!profiles.length) {
    const legacy = await new Promise((resolve) => {
      if (!hasChrome()) {
        resolve({});
        return;
      }
      chrome.storage.local.get(["slots", "colorPalettes", "clipcrate_ai_providers"], resolve);
    });
    const p = emptyProfile("Default");
    p.slots = Array.isArray(legacy.slots) ? legacy.slots : [];
    p.colorPalettes = Array.isArray(legacy.colorPalettes) ? legacy.colorPalettes : [];
    p.aiProviders = Array.isArray(legacy.clipcrate_ai_providers)
      ? legacy.clipcrate_ai_providers
      : [];
    profiles = [p];
    activeId = p.id;
    await write(profiles, activeId);
  }
  if (!activeId || !profiles.some((p) => p.id === activeId)) {
    activeId = profiles[0].id;
    await write(profiles, activeId);
  }
  return { profiles, activeId };
}

export async function listProfiles() {
  return ensureProfiles();
}

export async function getActiveProfile() {
  const { profiles, activeId } = await ensureProfiles();
  return profiles.find((p) => p.id === activeId) || profiles[0];
}

export async function setActiveProfile(id) {
  const { profiles } = await ensureProfiles();
  if (!profiles.some((p) => p.id === id)) throw new Error("Profile not found");
  await write(profiles, id);
  return profiles.find((p) => p.id === id);
}

export async function createProfile(name) {
  const { profiles, activeId } = await ensureProfiles();
  const p = emptyProfile((name || "New profile").trim() || "New profile");
  await write([...profiles, p], activeId);
  return p;
}

export async function renameProfile(id, name) {
  const { profiles, activeId } = await ensureProfiles();
  const next = profiles.map((p) =>
    p.id === id ? { ...p, name: name.trim() || p.name, updatedAt: Date.now() } : p
  );
  await write(next, activeId);
}

export async function deleteProfile(id) {
  const { profiles, activeId } = await ensureProfiles();
  if (profiles.length <= 1) throw new Error("Cannot delete the last profile");
  const next = profiles.filter((p) => p.id !== id);
  const newActive = activeId === id ? next[0].id : activeId;
  await write(next, newActive);
  return { profiles: next, activeId: newActive };
}

export async function saveActiveProfileData({ slots, colorPalettes, aiProviders }) {
  const { profiles, activeId } = await ensureProfiles();
  const next = profiles.map((p) =>
    p.id !== activeId
      ? p
      : {
          ...p,
          slots: slots || [],
          colorPalettes: colorPalettes || [],
          aiProviders: aiProviders || [],
          updatedAt: Date.now(),
        }
  );
  await write(next, activeId);
}

export async function copyBetweenProfiles(fromId, toId, { includeAi = false } = {}) {
  const { profiles, activeId } = await ensureProfiles();
  const from = profiles.find((p) => p.id === fromId);
  const to = profiles.find((p) => p.id === toId);
  if (!from || !to) throw new Error("Profile not found");
  const next = profiles.map((p) => {
    if (p.id !== toId) return p;
    return {
      ...p,
      slots: JSON.parse(JSON.stringify(from.slots || [])),
      colorPalettes: JSON.parse(JSON.stringify(from.colorPalettes || [])),
      ...(includeAi
        ? { aiProviders: JSON.parse(JSON.stringify(from.aiProviders || [])) }
        : {}),
      updatedAt: Date.now(),
    };
  });
  await write(next, activeId);
}

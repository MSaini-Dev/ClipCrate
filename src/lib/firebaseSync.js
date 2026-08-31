// src/lib/firebaseSync.js
// Initializes Firebase using either the built-in ClipCrate project
// or a user-supplied config. Supports push/pull of data (and optional AI keys).

import { initializeApp, getApps, deleteApp } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { getDatabase, ref, set, get } from "firebase/database";
import {
  getFirebaseMode,
  getFirebaseCustomConfig,
  isCloudBlocked,
} from "./syncSettings";

// Built-in project (your credentials). Users can switch to their own.
export const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyBQtN6LHPfOfMgakLVdFsVUA6lWdvtl2wE",
  authDomain: "clipcrate-18294.firebaseapp.com",
  databaseURL: "https://clipcrate-18294-default-rtdb.firebaseio.com",
  projectId: "clipcrate-18294",
  storageBucket: "clipcrate-18294.appspot.com",
  messagingSenderId: "1024417797137",
  appId: "1:1024417797137:web:b7696ed134c88b156d8db0",
  measurementId: "G-TY87S9EZ73",
};

const APP_NAME = "clipcrate-sync";

let currentApp = null;
let currentAuth = null;
let currentDb = null;

function isValidConfig(cfg) {
  return (
    cfg &&
    typeof cfg.apiKey === "string" &&
    cfg.apiKey.trim() &&
    typeof cfg.databaseURL === "string" &&
    cfg.databaseURL.trim() &&
    typeof cfg.projectId === "string" &&
    cfg.projectId.trim()
  );
}

/**
 * (Re)initialize Firebase with the active config (default or custom).
 * Returns { auth, db } or throws.
 */
export async function getFirebaseHandles() {
  if (await isCloudBlocked()) {
    throw new Error("Cloud sync is blocked. Turn off the privacy lock first.");
  }

  const mode = await getFirebaseMode();
  let config = DEFAULT_FIREBASE_CONFIG;
  if (mode === "custom") {
    const custom = await getFirebaseCustomConfig();
    if (!isValidConfig(custom)) {
      throw new Error(
        "Custom Firebase config is incomplete. Fill in apiKey, databaseURL, and projectId."
      );
    }
    config = {
      apiKey: custom.apiKey.trim(),
      authDomain: (custom.authDomain || "").trim() || undefined,
      databaseURL: custom.databaseURL.trim(),
      projectId: custom.projectId.trim(),
      storageBucket: (custom.storageBucket || "").trim() || undefined,
      messagingSenderId: (custom.messagingSenderId || "").trim() || undefined,
      appId: (custom.appId || "").trim() || undefined,
    };
  }

  // Tear down previous named app if config changed
  const existing = getApps().find((a) => a.name === APP_NAME);
  if (existing) {
    try {
      await deleteApp(existing);
    } catch (_) {}
    currentApp = null;
    currentAuth = null;
    currentDb = null;
  }

  currentApp = initializeApp(config, APP_NAME);
  currentAuth = getAuth(currentApp);
  currentDb = getDatabase(currentApp);
  return { auth: currentAuth, db: currentDb };
}

/** Ensure anonymous sign-in; returns uid. */
export async function ensureSignedIn() {
  const { auth } = await getFirebaseHandles();
  return new Promise((resolve, reject) => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      unsub();
      if (user) {
        resolve(user.uid);
        return;
      }
      try {
        const cred = await signInAnonymously(auth);
        resolve(cred.user.uid);
      } catch (err) {
        reject(err);
      }
    });
  });
}

/**
 * Push payload to Firebase under users/{uid}.
 * payload = { slots, colorPalettes, aiProviders?, lastUpdated }
 */
export async function firebasePush(payload) {
  if (await isCloudBlocked()) {
    throw new Error("Cloud sync is blocked.");
  }
  const uid = await ensureSignedIn();
  const { db } = await getFirebaseHandles();
  const userRef = ref(db, `users/${uid}`);
  const body = {
    data: {
      slots: payload.slots || [],
      colorPalettes: payload.colorPalettes || [],
      ...(payload.aiProviders ? { aiProviders: payload.aiProviders } : {}),
      lastUpdated: Date.now(),
    },
  };
  await set(userRef, body);
  return uid;
}

/**
 * Pull from users/{syncId}. Returns { slots, colorPalettes, aiProviders? } or null.
 */
export async function firebasePull(syncId) {
  if (await isCloudBlocked()) {
    throw new Error("Cloud sync is blocked.");
  }
  if (!syncId || !String(syncId).trim()) {
    throw new Error("Enter a Sync ID.");
  }
  await getFirebaseHandles();
  const { db } = await getFirebaseHandles();
  const userRef = ref(db, `users/${String(syncId).trim()}`);
  const snap = await get(userRef);
  const val = snap.val();
  if (!val?.data) return null;
  return {
    slots: Array.isArray(val.data.slots) ? val.data.slots : [],
    colorPalettes: Array.isArray(val.data.colorPalettes)
      ? val.data.colorPalettes
      : [],
    aiProviders: Array.isArray(val.data.aiProviders)
      ? val.data.aiProviders
      : undefined,
  };
}

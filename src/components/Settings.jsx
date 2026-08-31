// src/components/Settings.jsx
// Three sharing modes, each with data-only vs data+AI buttons.
// Plus: block all cloud sync, and optional user Firebase credentials.

import React, { useState, useEffect, useRef } from "react";
import {
  isCloudBlocked,
  setCloudBlocked,
  getChromeSyncIncludeAi,
  setChromeSyncIncludeAi,
  getFirebaseMode,
  setFirebaseMode,
  getFirebaseCustomConfig,
  setFirebaseCustomConfig,
} from "../lib/syncSettings";
import { firebasePush, firebasePull, ensureSignedIn } from "../lib/firebaseSync";
import { saveAiProviders } from "../lib/aiProviders";

function hasChromeStorage() {
  return typeof chrome !== "undefined" && chrome.storage;
}

export default function Settings({
  slots,
  colorPalettes,
  aiProviders,
  onSyncData,
  onAiProvidersChange,
  showFeedback,
}) {
  const [blocked, setBlocked] = useState(false);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [fbMode, setFbMode] = useState("default");
  const [fbConfig, setFbConfig] = useState({
    apiKey: "",
    authDomain: "",
    databaseURL: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: "",
  });
  const [mySyncId, setMySyncId] = useState("");
  const [remoteSyncId, setRemoteSyncId] = useState("");
  const fileInputRef = useRef(null);
  const [importIncludeAi, setImportIncludeAi] = useState(false);

  useEffect(() => {
    (async () => {
      setBlocked(await isCloudBlocked());
      const mode = await getFirebaseMode();
      setFbMode(mode);
      const custom = await getFirebaseCustomConfig();
      if (custom) setFbConfig((prev) => ({ ...prev, ...custom }));
    })();
  }, []);

  const setStatusMsg = (msg, type) => {
    setStatus(msg);
    if (type) showFeedback?.(msg, type);
  };

  const handleToggleBlock = async () => {
    const next = !blocked;
    await setCloudBlocked(next);
    setBlocked(next);
    setStatusMsg(
      next
        ? "Cloud sync blocked. Chrome Sync & Firebase are disabled."
        : "Cloud sync enabled again.",
      "success"
    );
  };

  const chromePush = async (includeAi) => {
    if (blocked) {
      setStatusMsg("Cloud sync is blocked.", "error");
      return;
    }
    if (!hasChromeStorage() || !chrome.storage.sync) {
      setStatusMsg("Chrome storage.sync is not available.", "error");
      return;
    }
    setBusy(true);
    try {
      await new Promise((resolve, reject) => {
        chrome.storage.sync.set(
          {
            clipcrate_sync_slots: slots || [],
            clipcrate_sync_palettes: colorPalettes || [],
            clipcrate_sync_ai: includeAi ? aiProviders || [] : null,
          },
          () => {
            if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
            else resolve();
          }
        );
      });
      await setChromeSyncIncludeAi(includeAi);
      setStatusMsg(
        includeAi
          ? "Pushed data + AI credentials to Chrome Sync."
          : "Pushed data (clips & palettes) to Chrome Sync.",
        "success"
      );
    } catch (err) {
      setStatusMsg(`Chrome Sync failed: ${err.message || err}`, "error");
    } finally {
      setBusy(false);
    }
  };

  const chromePull = async (includeAi) => {
    if (blocked) {
      setStatusMsg("Cloud sync is blocked.", "error");
      return;
    }
    if (!hasChromeStorage() || !chrome.storage.sync) {
      setStatusMsg("Chrome storage.sync is not available.", "error");
      return;
    }
    setBusy(true);
    try {
      const keys = ["clipcrate_sync_slots", "clipcrate_sync_palettes", "clipcrate_sync_ai"];
      const data = await new Promise((resolve) => {
        chrome.storage.sync.get(keys, (r) => resolve(r || {}));
      });
      const nextSlots = Array.isArray(data.clipcrate_sync_slots) ? data.clipcrate_sync_slots : [];
      const nextPalettes = Array.isArray(data.clipcrate_sync_palettes)
        ? data.clipcrate_sync_palettes
        : [];
      onSyncData?.(nextSlots, nextPalettes);
      if (includeAi && Array.isArray(data.clipcrate_sync_ai)) {
        onAiProvidersChange?.(data.clipcrate_sync_ai);
        await saveAiProviders(data.clipcrate_sync_ai);
      }
      setStatusMsg(
        includeAi
          ? `Pulled ${nextSlots.length} clip(s), ${nextPalettes.length} palette(s) + AI keys.`
          : `Pulled ${nextSlots.length} clip(s) and ${nextPalettes.length} palette(s).`,
        "success"
      );
    } catch (err) {
      setStatusMsg(`Chrome Sync pull failed: ${err.message || err}`, "error");
    } finally {
      setBusy(false);
    }
  };

  const handleSaveFirebaseMode = async (mode) => {
    await setFirebaseMode(mode);
    setFbMode(mode);
    setStatusMsg(
      mode === "custom"
        ? "Using your own Firebase project."
        : "Using ClipCrate default Firebase project.",
      "success"
    );
  };

  const handleSaveCustomConfig = async () => {
    if (!fbConfig.apiKey?.trim() || !fbConfig.databaseURL?.trim() || !fbConfig.projectId?.trim()) {
      setStatusMsg("apiKey, databaseURL, and projectId are required.", "error");
      return;
    }
    await setFirebaseCustomConfig(fbConfig);
    await setFirebaseMode("custom");
    setFbMode("custom");
    setStatusMsg("Custom Firebase config saved.", "success");
  };

  const handleClearCustomConfig = async () => {
    await setFirebaseCustomConfig(null);
    await setFirebaseMode("default");
    setFbMode("default");
    setFbConfig({
      apiKey: "",
      authDomain: "",
      databaseURL: "",
      projectId: "",
      storageBucket: "",
      messagingSenderId: "",
      appId: "",
    });
    setStatusMsg("Switched back to ClipCrate default Firebase.", "success");
  };

  const fbPush = async (includeAi) => {
    if (blocked) {
      setStatusMsg("Cloud sync is blocked.", "error");
      return;
    }
    setBusy(true);
    try {
      const payload = { slots: slots || [], colorPalettes: colorPalettes || [] };
      if (includeAi) payload.aiProviders = aiProviders || [];
      const uid = await firebasePush(payload);
      setMySyncId(uid);
      setStatusMsg(
        includeAi
          ? `Pushed data + AI keys. Your Sync ID: ${uid}`
          : `Pushed data only. Your Sync ID: ${uid}`,
        "success"
      );
    } catch (err) {
      setStatusMsg(`Firebase push failed: ${err.message || err}`, "error");
    } finally {
      setBusy(false);
    }
  };

  const fbPull = async (includeAi) => {
    if (blocked) {
      setStatusMsg("Cloud sync is blocked.", "error");
      return;
    }
    setBusy(true);
    try {
      const remote = await firebasePull(remoteSyncId);
      if (!remote) {
        setStatusMsg("No data found for that Sync ID.", "error");
        return;
      }
      onSyncData?.(remote.slots, remote.colorPalettes);
      if (includeAi && Array.isArray(remote.aiProviders)) {
        onAiProvidersChange?.(remote.aiProviders);
        await saveAiProviders(remote.aiProviders);
      }
      setStatusMsg(
        includeAi
          ? `Pulled ${remote.slots.length} clip(s), ${remote.colorPalettes.length} palette(s) + AI keys.`
          : `Pulled ${remote.slots.length} clip(s) and ${remote.colorPalettes.length} palette(s).`,
        "success"
      );
    } catch (err) {
      setStatusMsg(`Firebase pull failed: ${err.message || err}`, "error");
    } finally {
      setBusy(false);
    }
  };

  const handleGetMyId = async () => {
    if (blocked) {
      setStatusMsg("Cloud sync is blocked.", "error");
      return;
    }
    setBusy(true);
    try {
      const uid = await ensureSignedIn();
      setMySyncId(uid);
      setStatusMsg(`Your Sync ID: ${uid}`, "success");
    } catch (err) {
      setStatusMsg(`Could not get Sync ID: ${err.message || err}`, "error");
    } finally {
      setBusy(false);
    }
  };

  const copySyncId = () => {
    if (!mySyncId) return;
    navigator.clipboard?.writeText(mySyncId).then(
      () => setStatusMsg("Sync ID copied!", "success"),
      () => setStatusMsg("Copy failed", "error")
    );
  };

  const handleExport = (includeAi) => {
    const payload = {
      version: 2,
      exportedAt: new Date().toISOString(),
      slots: slots || [],
      colorPalettes: colorPalettes || [],
    };
    if (includeAi) payload.aiProviders = aiProviders || [];
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `clipcrate-backup-${includeAi ? "full" : "data"}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setStatusMsg(includeAi ? "Exported data + AI credentials." : "Exported data only.", "success");
  };

  const handleImportClick = (includeAi) => {
    setImportIncludeAi(includeAi);
    fileInputRef.current?.click();
  };

  const handleFileSelected = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const parsed = JSON.parse(reader.result);
        const nextSlots = Array.isArray(parsed.slots) ? parsed.slots : [];
        const nextPalettes = Array.isArray(parsed.colorPalettes)
          ? parsed.colorPalettes
          : Array.isArray(parsed.palettes)
          ? parsed.palettes
          : [];
        if (!nextSlots.length && !nextPalettes.length && !parsed.aiProviders) {
          setStatusMsg("File contains no usable data.", "error");
          return;
        }
        onSyncData?.(nextSlots, nextPalettes);
        if (importIncludeAi && Array.isArray(parsed.aiProviders) && parsed.aiProviders.length) {
          onAiProvidersChange?.(parsed.aiProviders);
          await saveAiProviders(parsed.aiProviders);
        }
        setStatusMsg(
          importIncludeAi
            ? `Imported ${nextSlots.length} clip(s), ${nextPalettes.length} palette(s) + AI keys.`
            : `Imported ${nextSlots.length} clip(s) and ${nextPalettes.length} palette(s).`,
          "success"
        );
      } catch {
        setStatusMsg("Invalid JSON file.", "error");
      } finally {
        setBusy(false);
        event.target.value = "";
      }
    };
    reader.onerror = () => {
      setStatusMsg("Could not read file.", "error");
      setBusy(false);
    };
    reader.readAsText(file);
  };

  return (
    <div className="settings-page">
      <div className="settings-content">
        <div className="sync-section">
          <h4>Privacy</h4>
          <p className="settings-hint">
            Block all internet sharing (Chrome Sync + Firebase). Local data and JSON export/import still work.
          </p>
          <button className={blocked ? "danger" : ""} onClick={handleToggleBlock} disabled={busy}>
            {blocked ? "Cloud sync is OFF - click to enable" : "Block all cloud sync"}
          </button>
        </div>

        <div className="line" style={{ margin: "12px 0" }} />

        <div className="sync-section">
          <h4>1. Chrome Storage Sync</h4>
          <p className="settings-hint">Same Google account only. Across your Chrome browsers.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <button disabled={busy || blocked} onClick={() => chromePush(false)}>Push data only</button>
            <button disabled={busy || blocked} onClick={() => chromePush(true)}>Push data + AI credentials</button>
            <button disabled={busy || blocked} onClick={() => chromePull(false)}>Pull data only</button>
            <button disabled={busy || blocked} onClick={() => chromePull(true)}>Pull data + AI credentials</button>
          </div>
        </div>

        <div className="line" style={{ margin: "12px 0" }} />

        <div className="sync-section">
          <h4>2. Firebase Cloud</h4>
          <p className="settings-hint">
            Share across devices with a Sync ID. Use ClipCrate project or your own Firebase credentials.
          </p>
          <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
            <button disabled={busy} className={fbMode === "default" ? "active" : ""} onClick={() => handleSaveFirebaseMode("default")}>
              Use ClipCrate project
            </button>
            <button disabled={busy} className={fbMode === "custom" ? "active" : ""} onClick={() => handleSaveFirebaseMode("custom")}>
              Use my own Firebase
            </button>
          </div>

          {fbMode === "custom" && (
            <div className="ai-provider-form" style={{ marginBottom: 10 }}>
              <input type="text" placeholder="apiKey *" value={fbConfig.apiKey} onChange={(e) => setFbConfig((c) => ({ ...c, apiKey: e.target.value }))} />
              <input type="text" placeholder="databaseURL *" value={fbConfig.databaseURL} onChange={(e) => setFbConfig((c) => ({ ...c, databaseURL: e.target.value }))} />
              <input type="text" placeholder="projectId *" value={fbConfig.projectId} onChange={(e) => setFbConfig((c) => ({ ...c, projectId: e.target.value }))} />
              <input type="text" placeholder="authDomain (optional)" value={fbConfig.authDomain} onChange={(e) => setFbConfig((c) => ({ ...c, authDomain: e.target.value }))} />
              <input type="text" placeholder="storageBucket (optional)" value={fbConfig.storageBucket} onChange={(e) => setFbConfig((c) => ({ ...c, storageBucket: e.target.value }))} />
              <input type="text" placeholder="appId (optional)" value={fbConfig.appId} onChange={(e) => setFbConfig((c) => ({ ...c, appId: e.target.value }))} />
              <div style={{ display: "flex", gap: 8 }}>
                <button disabled={busy} onClick={handleSaveCustomConfig}>Save my credentials</button>
                <button disabled={busy} onClick={handleClearCustomConfig}>Remove and use default</button>
              </div>
            </div>
          )}

          <div style={{ marginBottom: 8 }}>
            <button disabled={busy || blocked} onClick={handleGetMyId}>Get my Sync ID</button>
            {mySyncId && (
              <p style={{ marginTop: 6 }}>
                <code>{mySyncId}</code>{" "}
                <button type="button" onClick={copySyncId}>Copy</button>
              </p>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <button disabled={busy || blocked} onClick={() => fbPush(false)}>Push data only</button>
            <button disabled={busy || blocked} onClick={() => fbPush(true)}>Push data + AI credentials</button>
          </div>

          <div style={{ marginTop: 10 }}>
            <p className="settings-hint">Pull from another device:</p>
            <input type="text" placeholder="Enter Sync ID" value={remoteSyncId} onChange={(e) => setRemoteSyncId(e.target.value)} disabled={busy || blocked} />
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 6 }}>
              <button disabled={busy || blocked || !remoteSyncId.trim()} onClick={() => fbPull(false)}>Pull data only</button>
              <button disabled={busy || blocked || !remoteSyncId.trim()} onClick={() => fbPull(true)}>Pull data + AI credentials</button>
            </div>
          </div>
        </div>

        <div className="line" style={{ margin: "12px 0" }} />

        <div className="sync-section">
          <h4>3. JSON Export / Import</h4>
          <p className="settings-hint">Offline backup or share a file. Works even when cloud sync is blocked.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <button disabled={busy} onClick={() => handleExport(false)}>Export data only</button>
            <button disabled={busy} onClick={() => handleExport(true)}>Export data + AI credentials</button>
            <button disabled={busy} onClick={() => handleImportClick(false)}>Import data only</button>
            <button disabled={busy} onClick={() => handleImportClick(true)}>Import data + AI credentials</button>
          </div>
          <input ref={fileInputRef} type="file" accept=".json,application/json" style={{ display: "none" }} onChange={handleFileSelected} />
        </div>

        {status && (
          <div className="sync-status">
            <p>{status}</p>
          </div>
        )}
      </div>
    </div>
  );
}

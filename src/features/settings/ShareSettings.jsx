import React, { useEffect, useRef, useState } from "react";
import Toggle from "../../shared/ui/Toggle";
import Section from "../../shared/ui/Section";
import ActionButton from "../../shared/ui/ActionButton";
import {
  isCloudBlocked,
  setCloudBlocked,
  setChromeSyncIncludeAi,
  getFirebaseMode,
  setFirebaseMode,
  getFirebaseCustomConfig,
  setFirebaseCustomConfig,
} from "../../shared/lib/syncSettings";
import { firebasePush, firebasePull, ensureSignedIn } from "../../shared/lib/firebaseSync";
import { saveAiProviders } from "../../../lib/aiProviders";

function hasChromeStorage() {
  return typeof chrome !== "undefined" && chrome.storage;
}

export default function ShareSettings({
  slots,
  colorPalettes,
  aiProviders,
  onSyncData,
  onAiProvidersChange,
  showFeedback,
}) {
  const [blocked, setBlocked] = useState(false);
  const [includeAi, setIncludeAi] = useState(false);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [fbMode, setFbMode] = useState("default");
  const [fbConfig, setFbConfig] = useState({
    apiKey: "", authDomain: "", databaseURL: "", projectId: "", storageBucket: "", appId: "",
  });
  const [mySyncId, setMySyncId] = useState("");
  const [remoteSyncId, setRemoteSyncId] = useState("");
  const fileRef = useRef(null);

  useEffect(() => {
    (async () => {
      setBlocked(await isCloudBlocked());
      setFbMode(await getFirebaseMode());
      const custom = await getFirebaseCustomConfig();
      if (custom) setFbConfig((c) => ({ ...c, ...custom }));
    })();
  }, []);

  const notify = (msg, type = "success") => {
    setStatus(msg);
    showFeedback?.(msg, type);
  };

  const toggleBlock = async () => {
    const next = !blocked;
    await setCloudBlocked(next);
    setBlocked(next);
    notify(next ? "Cloud sync blocked" : "Cloud sync enabled");
  };

  const chromePush = async () => {
    if (blocked) return notify("Cloud sync is blocked", "error");
    if (!hasChromeStorage()?.sync) return notify("Chrome Sync unavailable", "error");
    setBusy(true);
    try {
      await new Promise((resolve, reject) => {
        chrome.storage.sync.set(
          {
            clipcrate_sync_slots: slots || [],
            clipcrate_sync_palettes: colorPalettes || [],
            clipcrate_sync_ai: includeAi ? aiProviders || [] : null,
          },
          () => (chrome.runtime.lastError ? reject(chrome.runtime.lastError) : resolve())
        );
      });
      await setChromeSyncIncludeAi(includeAi);
      notify(includeAi ? "Pushed data + AI keys" : "Pushed data");
    } catch (e) {
      notify(e.message || "Chrome Sync failed", "error");
    } finally {
      setBusy(false);
    }
  };

  const chromePull = async () => {
    if (blocked) return notify("Cloud sync is blocked", "error");
    if (!hasChromeStorage()?.sync) return notify("Chrome Sync unavailable", "error");
    setBusy(true);
    try {
      const data = await new Promise((resolve) => {
        chrome.storage.sync.get(
          ["clipcrate_sync_slots", "clipcrate_sync_palettes", "clipcrate_sync_ai"],
          resolve
        );
      });
      onSyncData?.(data.clipcrate_sync_slots || [], data.clipcrate_sync_palettes || []);
      if (includeAi && Array.isArray(data.clipcrate_sync_ai)) {
        onAiProvidersChange?.(data.clipcrate_sync_ai);
        await saveAiProviders(data.clipcrate_sync_ai);
      }
      notify(includeAi ? "Pulled data + AI keys" : "Pulled data");
    } catch (e) {
      notify(e.message || "Pull failed", "error");
    } finally {
      setBusy(false);
    }
  };

  const saveCustomFb = async () => {
    if (!fbConfig.apiKey?.trim() || !fbConfig.databaseURL?.trim() || !fbConfig.projectId?.trim()) {
      return notify("apiKey, databaseURL, projectId required", "error");
    }
    await setFirebaseCustomConfig(fbConfig);
    await setFirebaseMode("custom");
    setFbMode("custom");
    notify("Custom Firebase saved");
  };

  const useDefaultFb = async () => {
    await setFirebaseCustomConfig(null);
    await setFirebaseMode("default");
    setFbMode("default");
    notify("Using ClipCrate Firebase");
  };

  const fbPush = async () => {
    if (blocked) return notify("Cloud sync is blocked", "error");
    setBusy(true);
    try {
      const payload = { slots: slots || [], colorPalettes: colorPalettes || [] };
      if (includeAi) payload.aiProviders = aiProviders || [];
      const uid = await firebasePush(payload);
      setMySyncId(uid);
      notify(includeAi ? "Pushed data + AI" : "Pushed data");
    } catch (e) {
      notify(e.message || "Firebase push failed", "error");
    } finally {
      setBusy(false);
    }
  };

  const fbPull = async () => {
    if (blocked) return notify("Cloud sync is blocked", "error");
    setBusy(true);
    try {
      const remote = await firebasePull(remoteSyncId);
      if (!remote) return notify("No data for that Sync ID", "error");
      onSyncData?.(remote.slots, remote.colorPalettes);
      if (includeAi && Array.isArray(remote.aiProviders)) {
        onAiProvidersChange?.(remote.aiProviders);
        await saveAiProviders(remote.aiProviders);
      }
      notify(includeAi ? "Pulled data + AI keys" : "Pulled data");
    } catch (e) {
      notify(e.message || "Firebase pull failed", "error");
    } finally {
      setBusy(false);
    }
  };

  const getId = async () => {
    if (blocked) return notify("Cloud sync is blocked", "error");
    setBusy(true);
    try {
      const uid = await ensureSignedIn();
      setMySyncId(uid);
      notify("Sync ID ready");
    } catch (e) {
      notify(e.message || "Could not get ID", "error");
    } finally {
      setBusy(false);
    }
  };

  const doExport = () => {
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
    a.download = `clipcrate-${includeAi ? "full" : "data"}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    notify(includeAi ? "Exported data + AI" : "Exported data");
  };

  const onFile = (e) => {
    const file = e.target.files?.[0];
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
        onSyncData?.(nextSlots, nextPalettes);
        if (includeAi && Array.isArray(parsed.aiProviders)) {
          onAiProvidersChange?.(parsed.aiProviders);
          await saveAiProviders(parsed.aiProviders);
        }
        notify(includeAi ? "Imported data + AI" : "Imported data");
      } catch {
        notify("Invalid JSON", "error");
      } finally {
        setBusy(false);
        e.target.value = "";
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="settings-page cc-share">
      <Section title="Sharing options" description="Applies to Chrome Sync, Firebase, and JSON.">
        <Toggle
          checked={includeAi}
          onChange={setIncludeAi}
          label="Include AI credentials"
          hint="When on, push/pull/export also moves API keys"
        />
        <Toggle
          checked={blocked}
          onChange={toggleBlock}
          label="Block all cloud sync"
          hint="Disables Chrome Sync and Firebase. JSON still works."
        />
      </Section>

      <Section title="Chrome Sync" description="Same Google account across your browsers">
        <div className="cc-btn-row">
          <ActionButton disabled={busy || blocked} onClick={chromePush}>Push</ActionButton>
          <ActionButton disabled={busy || blocked} onClick={chromePull}>Pull</ActionButton>
        </div>
      </Section>

      <Section title="Firebase" description="Any device via Sync ID">
        <div className="cc-segmented">
          <button type="button" className={fbMode === "default" ? "is-active" : ""} onClick={useDefaultFb} disabled={busy}>ClipCrate</button>
          <button type="button" className={fbMode === "custom" ? "is-active" : ""} onClick={() => setFbMode("custom")} disabled={busy}>My project</button>
        </div>
        {fbMode === "custom" && (
          <div className="cc-form-stack">
            <input placeholder="apiKey *" value={fbConfig.apiKey} onChange={(e) => setFbConfig((c) => ({ ...c, apiKey: e.target.value }))} />
            <input placeholder="databaseURL *" value={fbConfig.databaseURL} onChange={(e) => setFbConfig((c) => ({ ...c, databaseURL: e.target.value }))} />
            <input placeholder="projectId *" value={fbConfig.projectId} onChange={(e) => setFbConfig((c) => ({ ...c, projectId: e.target.value }))} />
            <ActionButton variant="primary" disabled={busy} onClick={saveCustomFb}>Save credentials</ActionButton>
          </div>
        )}
        <div className="cc-id-row">
          <ActionButton disabled={busy || blocked} onClick={getId}>Get Sync ID</ActionButton>
          {mySyncId ? (
            <button type="button" className="cc-id-chip" onClick={() => { navigator.clipboard?.writeText(mySyncId); notify("Copied Sync ID"); }} title={mySyncId}>
              {mySyncId.slice(0, 10)}…
            </button>
          ) : null}
        </div>
        <div className="cc-btn-row">
          <ActionButton disabled={busy || blocked} onClick={fbPush}>Push</ActionButton>
          <ActionButton disabled={busy || blocked} onClick={fbPull}>Pull</ActionButton>
        </div>
        <input className="cc-full-input" placeholder="Paste Sync ID to pull" value={remoteSyncId} onChange={(e) => setRemoteSyncId(e.target.value)} disabled={busy || blocked} />
      </Section>

      <Section title="JSON file" description="Offline backup · works while cloud is blocked">
        <div className="cc-btn-row">
          <ActionButton disabled={busy} onClick={doExport}>Export</ActionButton>
          <ActionButton disabled={busy} onClick={() => fileRef.current?.click()}>Import</ActionButton>
        </div>
        <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={onFile} />
      </Section>

      {status ? <p className="cc-status">{status}</p> : null}
    </div>
  );
}

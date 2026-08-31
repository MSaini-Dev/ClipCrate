// src/components/Settings.jsx
// Personal sync → chrome.storage.sync (same Google account, automatic).
// Sharing with other people → JSON Export / Import (no cloud credentials needed).

import React, { useState, useRef } from "react";
import { pullFromSync } from "../storage";

export default function Settings({
  slots,
  colorPalettes,
  onBack,
  onSyncData,
  showFeedback,
}) {
  const [status, setStatus] = useState("");
  const [isWorking, setIsWorking] = useState(false);
  const fileInputRef = useRef(null);

  // ---------- Same-account sync (chrome.storage.sync) ----------
  const handlePullFromOtherDevices = async () => {
    setIsWorking(true);
    setStatus("Pulling from your other devices…");
    try {
      const { slots: remoteSlots, colorPalettes: remotePalettes } =
        await pullFromSync();
      onSyncData(remoteSlots, remotePalettes);
      setStatus(
        remoteSlots.length || remotePalettes.length
          ? "Updated from your other devices."
          : "No data found on other devices yet."
      );
      showFeedback?.("Synced from other devices", "success");
    } catch (err) {
      setStatus("Could not reach Chrome sync.");
      showFeedback?.("Sync failed", "error");
    } finally {
      setIsWorking(false);
    }
  };

  // ---------- Export JSON ----------
  const handleExport = () => {
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      slots: slots || [],
      colorPalettes: colorPalettes || [],
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `clipcrate-backup-${new Date()
      .toISOString()
      .slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setStatus("Backup downloaded.");
    showFeedback?.("Exported!", "success");
  };

  // ---------- Import JSON ----------
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsWorking(true);
    setStatus("Reading file…");

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        const nextSlots = Array.isArray(parsed.slots) ? parsed.slots : [];
        const nextPalettes = Array.isArray(parsed.colorPalettes)
          ? parsed.colorPalettes
          : Array.isArray(parsed.palettes)
          ? parsed.palettes
          : [];

        // Basic shape check
        if (!nextSlots.length && !nextPalettes.length) {
          setStatus("File contains no clips or palettes.");
          showFeedback?.("Nothing to import", "error");
          return;
        }

        onSyncData(nextSlots, nextPalettes);
        setStatus(
          `Imported ${nextSlots.length} clip(s) and ${nextPalettes.length} palette(s).`
        );
        showFeedback?.("Import successful!", "success");
      } catch (err) {
        setStatus("Invalid JSON file.");
        showFeedback?.("Import failed – bad file", "error");
      } finally {
        setIsWorking(false);
        // Reset so the same file can be chosen again
        event.target.value = "";
      }
    };
    reader.onerror = () => {
      setStatus("Could not read the file.");
      showFeedback?.("Import failed", "error");
      setIsWorking(false);
    };
    reader.readAsText(file);
  };

  return (
    <div className="settings-page">
      <div className="settings-content">
        {/* Same Google account */}
        <div className="sync-section">
          <h4>Same Google account</h4>
          <p className="settings-hint">
            ClipCrate automatically keeps your data in sync across devices
            signed into the same Google account (via Chrome’s built-in sync).
            Use the button below if you just signed in on a new device and
            want to pull the latest data right now.
          </p>
          <button
            onClick={handlePullFromOtherDevices}
            disabled={isWorking}
          >
            {isWorking ? "Working…" : "Pull from other devices"}
          </button>
        </div>

        <div className="line" style={{ margin: "12px 0" }} />

        {/* Export / Import for other people or offline backup */}
        <div className="sync-section">
          <h4>Share or backup (JSON)</h4>
          <p className="settings-hint">
            Export a file you can send to another person or keep as a backup.
            Import replaces the current clips and palettes with the contents
            of the file.
          </p>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button onClick={handleExport} disabled={isWorking}>
              Export JSON
            </button>
            <button onClick={handleImportClick} disabled={isWorking}>
              Import JSON
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            style={{ display: "none" }}
            onChange={handleFileSelected}
          />
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

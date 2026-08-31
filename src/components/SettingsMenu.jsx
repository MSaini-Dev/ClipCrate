import React, { useState } from "react";
import { ChevronLeft, Share2, Brain, Trash2, Info, UserRound } from "lucide-react";

export default function SettingsMenu({
  onSelectShare,
  onSelectProfiles,
  onSelectAiServices,
  onDeleteAll,
}) {
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [showAbout, setShowAbout] = useState(false);

  const handleDeleteAllClick = () => {
    if (deleteConfirm) {
      onDeleteAll();
      setDeleteConfirm(false);
    } else {
      setDeleteConfirm(true);
      setTimeout(() => setDeleteConfirm(false), 2000);
    }
  };

  if (showAbout) {
    return (
      <div className="settings-page">
        <button className="settings-back-btn" onClick={() => setShowAbout(false)}>
          <ChevronLeft size={16} strokeWidth={1.5} />
          <span>About</span>
        </button>
        <p className="about-text">
          ClipCrate keeps color palettes and text clips while you browse. Profiles isolate
          data and AI keys. Share via Chrome Sync, Firebase, or JSON with an optional
          AI-credentials toggle. Cloud sync can be fully blocked for privacy.
        </p>
      </div>
    );
  }

  return (
    <div className="settings-page">
      <div className="settings-menu-list">
        <button className="settings-menu-row" onClick={onSelectShare}>
          <Share2 size={16} strokeWidth={1.5} />
          <span>Share &amp; Sync</span>
        </button>
        <button className="settings-menu-row" onClick={onSelectProfiles}>
          <UserRound size={16} strokeWidth={1.5} />
          <span>Profiles</span>
        </button>
        <button className="settings-menu-row" onClick={onSelectAiServices}>
          <Brain size={16} strokeWidth={1.5} />
          <span>AI Services</span>
        </button>
        <button
          className={`settings-menu-row danger ${deleteConfirm ? "confirm" : ""}`}
          onClick={handleDeleteAllClick}
        >
          <Trash2 size={16} strokeWidth={1.5} />
          <span>{deleteConfirm ? "Tap again to confirm" : "Delete All"}</span>
        </button>
        <button className="settings-menu-row" onClick={() => setShowAbout(true)}>
          <Info size={16} strokeWidth={1.5} />
          <span>About</span>
        </button>
      </div>
    </div>
  );
}

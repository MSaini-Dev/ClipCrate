// src/components/SettingsMenu.jsx
import React, { useState } from "react";
import { ChevronLeft } from "lucide-react";
import { Share2, Brain, Trash2, Info } from "lucide-react";

export default function SettingsMenu({ onSelectShare, onSelectAiServices, onDeleteAll }) {
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
          <span>About Extension</span>
        </button>
        <p className="about-text">
          ClipCrate saves color palettes and text clips as you browse. Use the eyedropper to grab
          colors into palettes, the "+" to save clipboard text as a clip, and the AI assistant to
          ask about the extension or have it add a palette/clip for you. Cloud Sync backs your
          data up to a Sync ID you can restore on another device. AI Services lets you connect
          your own AI provider (base URL, API key, model) so the assistant has somewhere to send
          your questions.
        </p>
      </div>
    );
  }

return (
  <div className="settings-page">
    <div className="settings-menu-list">

      <button className="settings-menu-row" onClick={onSelectShare}>
        <Share2 size={16} strokeWidth={1.5} />
        <span>Share</span>
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

      <button
        className="settings-menu-row"
        onClick={() => setShowAbout(true)}
      >
        <Info size={16} strokeWidth={1.5} />
        <span>About Extension</span>
      </button>

    </div>
  </div>
);
}
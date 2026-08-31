// src/components/SettingsMenu.jsx
import React, { useState } from "react";
import { ChevronLeft, Share2, Brain, Trash2, Info } from "lucide-react";

export default function SettingsMenu({
  onSelectShare,
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
        <button
          className="settings-back-btn"
          onClick={() => setShowAbout(false)}
        >
          <ChevronLeft size={16} strokeWidth={1.5} />
          <span>About Extension</span>
        </button>
        <p className="about-text">
          ClipCrate saves color palettes and text clips as you browse. Use the
          eyedropper to grab colors into palettes, the “+” to save clipboard
          text as a clip, and the AI assistant to ask about the extension or
          have it add a palette/clip for you.
          <br />
          <br />
          Data stays on your device and is automatically synced across Chrome
          browsers signed into the same Google account. Use Export / Import
          JSON in the Share page to move data to another person or keep a
          backup. AI Services lets you connect your own AI provider (base URL,
          API key, model) so the assistant has somewhere to send your
          questions.
        </p>
      </div>
    );
  }

  return (
    <div className="settings-page">
      <div className="settings-menu-list">
        <button className="settings-menu-row" onClick={onSelectShare}>
          <Share2 size={16} strokeWidth={1.5} />
          <span>Share &amp; Backup</span>
        </button>

        <button className="settings-menu-row" onClick={onSelectAiServices}>
          <Brain size={16} strokeWidth={1.5} />
          <span>AI Services</span>
        </button>

        <button
          className={`settings-menu-row danger ${
            deleteConfirm ? "confirm" : ""
          }`}
          onClick={handleDeleteAllClick}
        >
          <Trash2 size={16} strokeWidth={1.5} />
          <span>
            {deleteConfirm ? "Tap again to confirm" : "Delete All"}
          </span>
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

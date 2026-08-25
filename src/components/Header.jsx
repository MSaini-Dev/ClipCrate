// src/components/Header.jsx
import React, { useState } from "react";
import {
  X,
  Plus,
  Settings as SettingsIcon,
  Pipette,
  Clipboard,
  BrainCircuit,
} from "lucide-react";

export default function Header({
  onAdd,
  onEyeDropper,
  activeView,
  onShowClipboardView,
  onShowAiView,
  showFeedback,
  settingsOpen,
  onShowSettings,
  onClose,
}) {
  const [addBtnDisabled, setAddBtnDisabled] = useState(false);
  const [eyedropperBtnDisabled, setEyedropperBtnDisabled] = useState(false);

  const handleAddClick = async () => {
    setAddBtnDisabled(true);
    await onAdd(); // Call the prop function
    setTimeout(() => {
      setAddBtnDisabled(false);
    }, 500);
  };

  const handleEyeDropperClick = async () => {
    setEyedropperBtnDisabled(true);
    try {
      await onEyeDropper(); // Call the prop function
    } catch (err) {
      // Cancelled or failed - the prop handler already surfaces feedback.
    } finally {
      setEyedropperBtnDisabled(false);
    }
  };

  // Consistent icon props for all Lucide icons
  const iconProps = {
    size: 16,
    strokeWidth: 1.5,
  };

  const isAiView = activeView === "ai";

  return (
    <div className="header">
      <div className="top-buttons">
        <h3>ClipCrate</h3>
        <div id="top-but-right">
          {/* Add / Eyedropper pill — both act as "paste" sources.
              In clipboard view they add to the board as before;
              in AI view they paste into the chat input instead. */}
          <div className="btn-pill">
            <button
              id="add-btn"
              title={isAiView ? "Paste clipboard into chat" : "Add clipboard content"}
              onClick={handleAddClick}
              disabled={addBtnDisabled}
            >
              <Plus {...iconProps} />
            </button>
            <button
              id="eyedropper"
              title={isAiView ? "Paste picked color into chat" : "Pick a color"}
              onClick={handleEyeDropperClick}
              disabled={eyedropperBtnDisabled}
            >
              <Pipette {...iconProps} />
            </button>
          </div>

          {/* Clipboard / AI pill — explicit view switch, active one highlighted */}
          <div className="btn-pill">
            <button
              id="view-clipboard"
              title="Clipboard"
              onClick={onShowClipboardView}
              className={!isAiView ? "active" : ""}
            >
              <Clipboard {...iconProps} />
            </button>
            <button
              id="view-ai"
              title="AI assistant"
              onClick={onShowAiView}
              className={isAiView ? "active" : ""}
            >
              <BrainCircuit {...iconProps} />
            </button>
          </div>

          <button
            id="setting"
            title="Settings"
            onClick={() => onShowSettings()}
            className={settingsOpen ? "active" : ""}
          >
            <SettingsIcon {...iconProps} />
          </button>
          <button id="close" title="Close" onClick={onClose}>
            <X {...iconProps} />
          </button>
        </div>
      </div>
    </div>
  );
}
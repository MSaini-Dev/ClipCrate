
import React, { useState, useEffect } from "react";
import Header from "./components/Header";
import SlotList from "./components/SlotList";
import PaletteList from "./components/PaletteList";
import ColorContextMenu from "./components/ColorContextMenu";
import PaletteContextMenu from "./components/PaletteContextMenu";
import Settings from "./components/Settings";
import SettingsMenu from "./components/SettingsMenu";
import AiServices from "./components/AiServices";
import AiChatView from "./components/AiChatView";
import { DragDropContext } from "react-beautiful-dnd";
import { getAiProviders, saveAiProviders } from "./lib/aiProviders";
import {
  getColorPalettes,
  getSlots,
  saveColorPalettes,
  saveSlots,
} from "./storage";

export default function App() {
  const [slots, setSlots] = useState([]);
  const [colorPalettes, setColorPalettes] = useState([]);
  const [contextMenu, setContextMenu] = useState(null);
  const [paletteContextMenu, setPaletteContextMenu] = useState(null);
  const [feedback, setFeedback] = useState({
    message: "",
    type: "",
    visible: false,
  });
  // null = settings closed, "menu" = main settings list, "cloudSync" =
  // Share/Cloud Sync page, "aiServices" = AI provider configuration page.
  const [settingsView, setSettingsView] = useState(null);
  const [activeView, setActiveView] = useState("default");
  const [isInitialized, setIsInitialized] = useState(false);
  const [aiInput, setAiInput] = useState("");
  const [aiMessages, setAiMessages] = useState([]);
  const [aiProviders, setAiProviders] = useState([]);

  useEffect(() => {
    const initializeData = async () => {
      await Promise.all([
        getSlots(setSlots),
        getColorPalettes(setColorPalettes),
        getAiProviders(setAiProviders),
      ]);
      setIsInitialized(true);
    };
    initializeData();
  }, []);

  useEffect(() => {
    if (isInitialized) {
      saveSlots(slots);
    }
  }, [slots, isInitialized]);

  useEffect(() => {
    if (isInitialized) {
      saveColorPalettes(colorPalettes);
    }
  }, [colorPalettes, isInitialized]);

  const showFeedback = (message, type) => {
    setFeedback({ message, type, visible: true });
    setTimeout(() => {
      setFeedback({ message: "", type: "", visible: false });
    }, 2000);
  };

  // Shared, dedupe-aware slot creator. Used by the clipboard "+" button
  // AND by the AI assistant when it adds a text clip on the user's behalf.
  const addTextSlot = (rawText) => {
    const text = (rawText || "").trim();
    if (!text) {
      showFeedback("Nothing to add!", "error");
      return false;
    }
    let wasDuplicate = false;
    setSlots((prevSlots) => {
      if (prevSlots.some((s) => s.text === text)) {
        wasDuplicate = true;
        return prevSlots;
      }
      const uniqueId = `slot_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;
      const newSlot = { id: uniqueId, text, timestamp: Date.now() };
      return [newSlot, ...prevSlots.slice(0, 9)];
    });

    if (wasDuplicate) {
      showFeedback("That clip is already saved!", "error");
      return false;
    }
    showFeedback("Clip added!", "success");
    return true;
  };

  const handleAddClip = async () => {
    try {
      if (!navigator.clipboard) {
        showFeedback("Clipboard API not available!", "error");
        return;
      }
      window.focus();
      await new Promise((resolve) => setTimeout(resolve, 100));

      const clipboardPromise = navigator.clipboard.readText();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Clipboard read timeout")), 3000)
      );
      const clipboardText = await Promise.race([
        clipboardPromise,
        timeoutPromise,
      ]);

      if (clipboardText && clipboardText.trim()) {
        addTextSlot(clipboardText);
      } else {
        showFeedback("Clipboard is empty!", "error");
      }
    } catch (error) {
      showFeedback("Failed to read clipboard!", "error");
    }
  };

  // In the AI view, the header's "+" button pastes clipboard text into the
  // chat input instead of saving a slot.
  const handlePasteClipboardToAi = async () => {
    try {
      if (!navigator.clipboard) {
        showFeedback("Clipboard API not available!", "error");
        return;
      }
      window.focus();
      await new Promise((resolve) => setTimeout(resolve, 100));

      const clipboardPromise = navigator.clipboard.readText();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Clipboard read timeout")), 3000)
      );
      const clipboardText = await Promise.race([
        clipboardPromise,
        timeoutPromise,
      ]);

      if (clipboardText && clipboardText.trim()) {
        const text = clipboardText.trim();
        setAiInput((prev) => (prev ? `${prev} ${text}` : text));
        showFeedback("Pasted into chat!", "success");
      } else {
        showFeedback("Clipboard is empty!", "error");
      }
    } catch (error) {
      showFeedback("Failed to read clipboard!", "error");
    }
  };

  const handleClearAll = () => {
    setSlots([]);
    setColorPalettes([]);
    showFeedback("All data cleared!", "success");
  };

  const handleEyeDropper = async () => {
    if (!window.EyeDropper) {
      showFeedback("EyeDropper not supported!", "error");
      return;
    }
    try {
      const eyeDropper = new EyeDropper();
      const result = await eyeDropper.open();
      if (result && result.sRGBHex) {
        const color = result.sRGBHex;
        const newPalette = {
          title: `Palette ${colorPalettes.length + 1}`,
          colors: [color],
          collapsed: false,
          timestamp: Date.now(),
        };
        setColorPalettes((prev) => [newPalette, ...prev]);
        showFeedback(`New palette with ${color} created!`, "success");
      }
    } catch (error) {
      if (error.name !== "AbortError") {
        showFeedback("EyeDropper failed!", "error");
      }
      throw error;
    }
  };

  // In the AI view, the eyedropper pastes the picked hex code into the
  // chat input instead of creating a new palette.
  const handlePickColorToAi = async () => {
    if (!window.EyeDropper) {
      showFeedback("EyeDropper not supported!", "error");
      return;
    }
    try {
      const eyeDropper = new EyeDropper();
      const result = await eyeDropper.open();
      if (result && result.sRGBHex) {
        const color = result.sRGBHex;
        setAiInput((prev) => (prev ? `${prev} ${color}` : color));
        showFeedback(`Pasted ${color} into chat!`, "success");
      }
    } catch (error) {
      if (error.name !== "AbortError") {
        showFeedback("EyeDropper failed!", "error");
      }
      throw error;
    }
  };

  const handleClose = () => {
    const rootEl = document.getElementById("my-extension-root");
    if (rootEl) rootEl.remove();
  };

  // Explicit view switches for the clipboard/brain pill (two distinct
  // buttons rather than a single toggle).
  const handleShowClipboardView = () => {
    setSettingsView(null);
    setActiveView("default");
  };
  const handleShowAiView = () => {
    setSettingsView(null);
    setActiveView("ai");
  };

  const handleUpdateSlotText = (index, newText) => {
    setSlots((prevSlots) =>
      prevSlots.map((slot, i) =>
        i === index ? { ...slot, text: newText, timestamp: Date.now() } : slot
      )
    );
  };

  const handleDeleteSlot = (index) => {
    setSlots((prevSlots) => prevSlots.filter((_, i) => i !== index));
    showFeedback("Clip deleted!", "success");
  };

  const handleToggleCollapse = (index) => {
    setColorPalettes((prev) =>
      prev.map((palette, i) =>
        i === index ? { ...palette, collapsed: !palette.collapsed } : palette
      )
    );
  };

  const handleDeletePalette = (index) => {
    setColorPalettes((prev) => prev.filter((_, i) => i !== index));
    showFeedback("Palette deleted!", "success");
  };

  const handleAddColor = async (paletteIndex) => {
    if (!window.EyeDropper) {
      showFeedback("EyeDropper not supported!", "error");
      return;
    }
    try {
      const eyeDropper = new EyeDropper();
      const result = await eyeDropper.open();
      if (result && result.sRGBHex) {
        const color = result.sRGBHex;
        let wasDuplicate = false;
        let wasFull = false;
        setColorPalettes((prev) =>
          prev.map((palette, i) => {
            if (i !== paletteIndex) return palette;
            if (palette.colors.includes(color)) {
              wasDuplicate = true;
              return palette;
            }
            if (palette.colors.length >= 10) {
              wasFull = true;
              return palette;
            }
            return { ...palette, colors: [...palette.colors, color] };
          })
        );

        if (wasDuplicate) {
          showFeedback("That color is already in this palette!", "error");
        } else if (wasFull) {
          showFeedback("Palette is full (10 colors max)!", "error");
        } else {
          showFeedback(`Color ${color} added!`, "success");
        }
      }
    } catch (error) {
      if (error.name !== "AbortError") {
        showFeedback("EyeDropper failed!", "error");
      }
    }
  };

  const handleReplaceColor = async (paletteIndex, colorIndex) => {
    if (!window.EyeDropper) {
      showFeedback("EyeDropper not supported!", "error");
      return;
    }
    try {
      const eyeDropper = new EyeDropper();
      const result = await eyeDropper.open();
      if (result && result.sRGBHex) {
        const color = result.sRGBHex;
        let wasDuplicate = false;
        setColorPalettes((prev) =>
          prev.map((palette, i) => {
            if (i !== paletteIndex) return palette;
            const existsElsewhere = palette.colors.some(
              (c, ci) => ci !== colorIndex && c === color
            );
            if (existsElsewhere) {
              wasDuplicate = true;
              return palette;
            }
            return {
              ...palette,
              colors: palette.colors.map((c, ci) =>
                ci === colorIndex ? color : c
              ),
            };
          })
        );

        if (wasDuplicate) {
          showFeedback("That color is already in this palette!", "error");
        } else {
          showFeedback(`Color replaced with ${color}!`, "success");
        }
      }
    } catch (error) {
      if (error.name !== "AbortError") {
        showFeedback("EyeDropper failed!", "error");
      }
    }
  };

  const handleDeleteColor = (paletteIndex, colorIndex) => {
    setColorPalettes((prev) =>
      prev.map((palette, i) =>
        i === paletteIndex
          ? {
            ...palette,
            colors: palette.colors.filter((_, ci) => ci !== colorIndex),
          }
          : palette
      )
    );
    showFeedback("Color deleted!", "success");
    setContextMenu(null);
  };

  const handleShowContextMenu = (event, color, paletteIndex, colorIndex) => {
    event.preventDefault();
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      color,
      paletteIndex,
      colorIndex,
    });
  };

  const handleShowPaletteContextMenu = (event, paletteIndex) => {
    event.preventDefault();
    setPaletteContextMenu({
      x: event.clientX,
      y: event.clientY,
      paletteIndex,
    });
  };

  const handleCloseContextMenu = () => setContextMenu(null);
  const handleClosePaletteContextMenu = () => setPaletteContextMenu(null);

  // --- AI assistant "add only" actions -------------------------------
  // The AI is only ever allowed to ADD data. It has no delete/read
  // handlers wired to it anywhere, by design, to keep existing data safe.
  const HEX_COLOR_REGEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

  const handleAddPaletteFromAi = (title, colors) => {
    const validColors = Array.isArray(colors)
      ? colors
        .map((c) => (typeof c === "string" ? c.trim() : ""))
        .filter((c) => HEX_COLOR_REGEX.test(c))
      : [];
    const uniqueColors = [...new Set(validColors)].slice(0, 10);

    if (uniqueColors.length === 0) {
      showFeedback("AI didn't provide any valid colors!", "error");
      return false;
    }

    const newPalette = {
      title: (title && title.trim()) || `Palette ${colorPalettes.length + 1}`,
      colors: uniqueColors,
      collapsed: false,
      timestamp: Date.now(),
    };
    setColorPalettes((prev) => [newPalette, ...prev]);
    showFeedback("AI added a palette!", "success");
    return true;
  };

  const handleAddTextSlotFromAi = (text) => addTextSlot(text);

  // Persists any change made in the AI Services settings page (add/remove
  // provider, key, or model).
  const handleAiProvidersChange = (nextProviders) => {
    setAiProviders(nextProviders);
    saveAiProviders(nextProviders);
  };

  // Called by brain.js when a key comes back 401/403 - marks it disabled,
  // same as data_store.py's disable_api(), so it's skipped next time.
  const handleAiKeyDisabled = (providerId, keyId) => {
    setAiProviders((prev) => {
      const next = prev.map((p) =>
        p.id !== providerId
          ? p
          : {
            ...p,
            apiKeys: p.apiKeys.map((k) =>
              k.id === keyId ? { ...k, status: "disabled" } : k
            ),
          }
      );
      saveAiProviders(next);
      return next;
    });
    showFeedback("An AI provider key was rejected and has been disabled.", "error");
  };

  const handleDragEnd = (result) => {
    const { source, destination, type } = result;
    if (!destination || !source) return;

    if (type === "PALETTE") {
      setColorPalettes((prev) => {
        const arr = Array.from(prev);
        const [moved] = arr.splice(source.index, 1);
        arr.splice(destination.index, 0, moved);
        saveColorPalettes(arr);
        return arr;
      });
    } else if (type.startsWith("COLOR")) {
      const paletteIndex = parseInt(type.split("-")[1], 10);
      setColorPalettes((prev) => {
        const arr = [...prev];
        if (!arr[paletteIndex]) return prev;
        const colors = Array.from(arr[paletteIndex].colors);
        const [moved] = colors.splice(source.index, 1);
        colors.splice(destination.index, 0, moved);
        arr[paletteIndex] = { ...arr[paletteIndex], colors };
        saveColorPalettes(arr);
        return arr;
      });
    } else if (type === "SLOT") {
      setSlots((prev) => {
        const arr = Array.from(prev);
        const [moved] = arr.splice(source.index, 1);
        arr.splice(destination.index, 0, moved);
        saveSlots(arr);
        return arr;
      });
    }
  };

  return (
    <div className="app">
      <Header
        onAdd={activeView === "ai" ? handlePasteClipboardToAi : handleAddClip}
        onEyeDropper={activeView === "ai" ? handlePickColorToAi : handleEyeDropper}
        activeView={activeView}
        onShowClipboardView={handleShowClipboardView}
        onShowAiView={handleShowAiView}
        showFeedback={showFeedback}
        settingsOpen={settingsView !== null}
        onShowSettings={() =>
          setSettingsView((prev) => (prev === null ? "menu" : null))
        }
        onClose={handleClose}
      />

      <div className="line"></div>

      {settingsView === "menu" ? (
        <div className="scrollbox">
          <SettingsMenu
            onSelectShare={() => setSettingsView("cloudSync")}
            onSelectAiServices={() => setSettingsView("aiServices")}
            onDeleteAll={handleClearAll}
          />
        </div>
      ) : settingsView === "cloudSync" ? (
        <div className="scrollbox">
          <Settings
            slots={slots}
            colorPalettes={colorPalettes}
            onBack={() => setSettingsView("menu")}
            onSyncData={(nextSlots, nextPalettes) => {
              setSlots(nextSlots || []);
              setColorPalettes(nextPalettes || []);
            }}
          />
        </div>
      ) : settingsView === "aiServices" ? (
        <div className="scrollbox">
          <AiServices
            providers={aiProviders}
            onChange={handleAiProvidersChange}
            onBack={() => setSettingsView("menu")}
            showFeedback={showFeedback}
          />
        </div>
      ) : activeView === "ai" ? (
        <div className="scrollbox ai-mode-scrollbox">
          <AiChatView
            input={aiInput}
            onInputChange={setAiInput}
            messages={aiMessages}
            onMessagesChange={setAiMessages}
            onAddPalette={handleAddPaletteFromAi}
            onAddTextSlot={handleAddTextSlotFromAi}
            providers={aiProviders}
            onKeyDisabled={handleAiKeyDisabled}
            showFeedback={showFeedback}
          />
        </div>
      ) : (
        <div className="scrollbox">
          <DragDropContext onDragEnd={handleDragEnd}>
            <PaletteList
              palettes={colorPalettes}
              onToggleCollapse={handleToggleCollapse}
              onDeletePalette={handleDeletePalette}
              onAddColor={handleAddColor}
              onReplaceColor={handleReplaceColor}
              onDeleteColor={handleDeleteColor}
              onShowContextMenu={handleShowContextMenu}
              onShowPaletteContextMenu={handleShowPaletteContextMenu}
              showFeedback={showFeedback}
            />

            <div className="line"></div>

            <SlotList
              slots={slots}
              onUpdateSlotText={handleUpdateSlotText}
              onDeleteSlot={handleDeleteSlot}
              showFeedback={showFeedback}
            />
          </DragDropContext>

          {/* Context menus rendered outside of drag containers */}
          {contextMenu && (
            <ColorContextMenu
              x={contextMenu.x}
              y={contextMenu.y}
              color={contextMenu.color}
              paletteIndex={contextMenu.paletteIndex}
              colorIndex={contextMenu.colorIndex}
              onClose={handleCloseContextMenu}
              onColorDelete={handleDeleteColor}
              showFeedback={showFeedback}
            />
          )}

          {paletteContextMenu && (
            <PaletteContextMenu
              x={paletteContextMenu.x}
              y={paletteContextMenu.y}
              paletteIndex={paletteContextMenu.paletteIndex}
              onClose={handleClosePaletteContextMenu}
              onPaletteDelete={handleDeletePalette}
            />
          )}
        </div>
      )}
    </div>
  );
}
import React, { useState, useEffect } from "react";
import Header from "./components/Header";
import SlotList from "./components/SlotList";
import PaletteList from "./components/PaletteList";
import ColorContextMenu from "./components/ColorContextMenu";
import PaletteContextMenu from "./components/PaletteContextMenu";
import Settings from "./components/Settings";
import SettingsMenu from "./components/SettingsMenu";
import ProfilesSettings from "./features/profiles/ProfilesSettings";
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
import {
  getActiveProfile,
  saveActiveProfileData,
} from "./shared/lib/profiles";

export default function App() {
  const [slots, setSlots] = useState([]);
  const [colorPalettes, setColorPalettes] = useState([]);
  const [contextMenu, setContextMenu] = useState(null);
  const [paletteContextMenu, setPaletteContextMenu] = useState(null);
  const [feedback, setFeedback] = useState({ message: "", type: "", visible: false });
  const [settingsView, setSettingsView] = useState(null);
  const [activeView, setActiveView] = useState("default");
  const [isInitialized, setIsInitialized] = useState(false);
  const [aiInput, setAiInput] = useState("");
  const [aiMessages, setAiMessages] = useState([]);
  const [aiProviders, setAiProviders] = useState([]);

  useEffect(() => {
    const initializeData = async () => {
      try {
        const profile = await getActiveProfile();
        if (profile) {
          setSlots(profile.slots || []);
          setColorPalettes(profile.colorPalettes || []);
          setAiProviders(profile.aiProviders || []);
        } else {
          await Promise.all([
            getSlots(setSlots),
            getColorPalettes(setColorPalettes),
            getAiProviders(setAiProviders),
          ]);
        }
      } catch {
        await Promise.all([
          getSlots(setSlots),
          getColorPalettes(setColorPalettes),
          getAiProviders(setAiProviders),
        ]);
      }
      setIsInitialized(true);
    };
    initializeData();
  }, []);

  useEffect(() => {
    if (!isInitialized) return;
    saveSlots(slots);
    saveActiveProfileData({ slots, colorPalettes, aiProviders });
  }, [slots, isInitialized]);

  useEffect(() => {
    if (!isInitialized) return;
    saveColorPalettes(colorPalettes);
    saveActiveProfileData({ slots, colorPalettes, aiProviders });
  }, [colorPalettes, isInitialized]);

  const showFeedback = (message, type) => {
    setFeedback({ message, type, visible: true });
    setTimeout(() => setFeedback({ message: "", type: "", visible: false }), 2000);
  };

  const handleProfileSwitched = (profile) => {
    if (!profile) return;
    setSlots(profile.slots || []);
    setColorPalettes(profile.colorPalettes || []);
    setAiProviders(profile.aiProviders || []);
  };

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
      const uniqueId = `slot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      return [{ id: uniqueId, text, timestamp: Date.now() }, ...prevSlots.slice(0, 9)];
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
      if (!navigator.clipboard) return showFeedback("Clipboard API not available!", "error");
      window.focus();
      await new Promise((r) => setTimeout(r, 100));
      const text = await Promise.race([
        navigator.clipboard.readText(),
        new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 3000)),
      ]);
      if (text && text.trim()) addTextSlot(text);
      else showFeedback("Clipboard is empty!", "error");
    } catch {
      showFeedback("Failed to read clipboard!", "error");
    }
  };

  const handlePasteClipboardToAi = async () => {
    try {
      if (!navigator.clipboard) return showFeedback("Clipboard API not available!", "error");
      window.focus();
      await new Promise((r) => setTimeout(r, 100));
      const text = await Promise.race([
        navigator.clipboard.readText(),
        new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 3000)),
      ]);
      if (text && text.trim()) {
        const t = text.trim();
        setAiInput((prev) => (prev ? `${prev} ${t}` : t));
        showFeedback("Pasted into chat!", "success");
      } else showFeedback("Clipboard is empty!", "error");
    } catch {
      showFeedback("Failed to read clipboard!", "error");
    }
  };

  const handleClearAll = () => {
    setSlots([]);
    setColorPalettes([]);
    showFeedback("All data cleared!", "success");
  };

  const handleEyeDropper = async () => {
    if (!window.EyeDropper) return showFeedback("EyeDropper not supported!", "error");
    try {
      const result = await new EyeDropper().open();
      if (result?.sRGBHex) {
        setColorPalettes((prev) => [
          { title: `Palette ${prev.length + 1}`, colors: [result.sRGBHex], collapsed: false, timestamp: Date.now() },
          ...prev,
        ]);
        showFeedback(`New palette with ${result.sRGBHex} created!`, "success");
      }
    } catch (e) {
      if (e.name !== "AbortError") showFeedback("EyeDropper failed!", "error");
    }
  };

  const handlePickColorToAi = async () => {
    if (!window.EyeDropper) return showFeedback("EyeDropper not supported!", "error");
    try {
      const result = await new EyeDropper().open();
      if (result?.sRGBHex) {
        setAiInput((prev) => (prev ? `${prev} ${result.sRGBHex}` : result.sRGBHex));
        showFeedback(`Pasted ${result.sRGBHex} into chat!`, "success");
      }
    } catch (e) {
      if (e.name !== "AbortError") showFeedback("EyeDropper failed!", "error");
    }
  };

  const handleClose = () => document.getElementById("my-extension-root")?.remove();
  const handleShowClipboardView = () => { setSettingsView(null); setActiveView("default"); };
  const handleShowAiView = () => { setSettingsView(null); setActiveView("ai"); };

  const handleUpdateSlotText = (index, newText) => {
    setSlots((prev) => prev.map((s, i) => (i === index ? { ...s, text: newText, timestamp: Date.now() } : s)));
  };
  const handleDeleteSlot = (index) => {
    setSlots((prev) => prev.filter((_, i) => i !== index));
    showFeedback("Clip deleted!", "success");
  };
  const handleToggleCollapse = (index) => {
    setColorPalettes((prev) => prev.map((p, i) => (i === index ? { ...p, collapsed: !p.collapsed } : p)));
  };
  const handleDeletePalette = (index) => {
    setColorPalettes((prev) => prev.filter((_, i) => i !== index));
    showFeedback("Palette deleted!", "success");
  };

  const handleAddColor = async (paletteIndex) => {
    if (!window.EyeDropper) return showFeedback("EyeDropper not supported!", "error");
    try {
      const result = await new EyeDropper().open();
      if (!result?.sRGBHex) return;
      const color = result.sRGBHex;
      let wasDuplicate = false, wasFull = false;
      setColorPalettes((prev) =>
        prev.map((palette, i) => {
          if (i !== paletteIndex) return palette;
          if (palette.colors.includes(color)) { wasDuplicate = true; return palette; }
          if (palette.colors.length >= 10) { wasFull = true; return palette; }
          return { ...palette, colors: [...palette.colors, color] };
        })
      );
      if (wasDuplicate) showFeedback("That color is already in this palette!", "error");
      else if (wasFull) showFeedback("Palette is full (10 colors max)!", "error");
      else showFeedback(`Color ${color} added!`, "success");
    } catch (e) {
      if (e.name !== "AbortError") showFeedback("EyeDropper failed!", "error");
    }
  };

  const handleReplaceColor = async (paletteIndex, colorIndex) => {
    if (!window.EyeDropper) return showFeedback("EyeDropper not supported!", "error");
    try {
      const result = await new EyeDropper().open();
      if (!result?.sRGBHex) return;
      const color = result.sRGBHex;
      let wasDuplicate = false;
      setColorPalettes((prev) =>
        prev.map((palette, i) => {
          if (i !== paletteIndex) return palette;
          if (palette.colors.some((c, ci) => ci !== colorIndex && c === color)) {
            wasDuplicate = true;
            return palette;
          }
          return { ...palette, colors: palette.colors.map((c, ci) => (ci === colorIndex ? color : c)) };
        })
      );
      if (wasDuplicate) showFeedback("That color is already in this palette!", "error");
      else showFeedback(`Color replaced with ${color}!`, "success");
    } catch (e) {
      if (e.name !== "AbortError") showFeedback("EyeDropper failed!", "error");
    }
  };

  const handleDeleteColor = (paletteIndex, colorIndex) => {
    setColorPalettes((prev) =>
      prev.map((palette, i) =>
        i === paletteIndex ? { ...palette, colors: palette.colors.filter((_, ci) => ci !== colorIndex) } : palette
      )
    );
    showFeedback("Color deleted!", "success");
    setContextMenu(null);
  };

  const handleShowContextMenu = (event, color, paletteIndex, colorIndex) => {
    event.preventDefault();
    setContextMenu({ x: event.clientX, y: event.clientY, color, paletteIndex, colorIndex });
  };
  const handleShowPaletteContextMenu = (event, paletteIndex) => {
    event.preventDefault();
    setPaletteContextMenu({ x: event.clientX, y: event.clientY, paletteIndex });
  };

  const HEX_COLOR_REGEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
  const handleAddPaletteFromAi = (title, colors) => {
    const valid = Array.isArray(colors)
      ? colors.map((c) => (typeof c === "string" ? c.trim() : "")).filter((c) => HEX_COLOR_REGEX.test(c))
      : [];
    const unique = [...new Set(valid)].slice(0, 10);
    if (!unique.length) {
      showFeedback("AI didn't provide any valid colors!", "error");
      return false;
    }
    setColorPalettes((prev) => [
      { title: (title && title.trim()) || `Palette ${prev.length + 1}`, colors: unique, collapsed: false, timestamp: Date.now() },
      ...prev,
    ]);
    showFeedback("AI added a palette!", "success");
    return true;
  };

  const handleAiProvidersChange = (next) => {
    setAiProviders(next);
    saveAiProviders(next);
    saveActiveProfileData({ slots, colorPalettes, aiProviders: next });
  };

  const handleAiKeyDisabled = (providerId, keyId) => {
    setAiProviders((prev) => {
      const next = prev.map((p) =>
        p.id !== providerId
          ? p
          : { ...p, apiKeys: p.apiKeys.map((k) => (k.id === keyId ? { ...k, status: "disabled" } : k)) }
      );
      saveAiProviders(next);
      saveActiveProfileData({ slots, colorPalettes, aiProviders: next });
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
        onShowSettings={() => setSettingsView((prev) => (prev === null ? "menu" : null))}
        onClose={handleClose}
      />
      <div className="line"></div>

      {settingsView === "menu" ? (
        <div className="scrollbox">
          <SettingsMenu
            onSelectShare={() => setSettingsView("cloudSync")}
            onSelectProfiles={() => setSettingsView("profiles")}
            onSelectAiServices={() => setSettingsView("aiServices")}
            onDeleteAll={handleClearAll}
          />
        </div>
      ) : settingsView === "cloudSync" ? (
        <div className="scrollbox">
          <Settings
            slots={slots}
            colorPalettes={colorPalettes}
            aiProviders={aiProviders}
            onBack={() => setSettingsView("menu")}
            onSyncData={(nextSlots, nextPalettes) => {
              setSlots(nextSlots || []);
              setColorPalettes(nextPalettes || []);
            }}
            onAiProvidersChange={(next) => {
              setAiProviders(next || []);
              saveAiProviders(next || []);
            }}
            showFeedback={showFeedback}
          />
        </div>
      ) : settingsView === "profiles" ? (
        <div className="scrollbox">
          <ProfilesSettings showFeedback={showFeedback} onProfileSwitched={handleProfileSwitched} />
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
            onAddTextSlot={addTextSlot}
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
          {contextMenu && (
            <ColorContextMenu
              x={contextMenu.x}
              y={contextMenu.y}
              color={contextMenu.color}
              paletteIndex={contextMenu.paletteIndex}
              colorIndex={contextMenu.colorIndex}
              onClose={() => setContextMenu(null)}
              onColorDelete={handleDeleteColor}
              showFeedback={showFeedback}
            />
          )}
          {paletteContextMenu && (
            <PaletteContextMenu
              x={paletteContextMenu.x}
              y={paletteContextMenu.y}
              paletteIndex={paletteContextMenu.paletteIndex}
              onClose={() => setPaletteContextMenu(null)}
              onPaletteDelete={handleDeletePalette}
            />
          )}
        </div>
      )}
    </div>
  );
}

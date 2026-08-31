import React, { useEffect, useState } from "react";
import Section from "../../shared/ui/Section";
import ActionButton from "../../shared/ui/ActionButton";
import Toggle from "../../shared/ui/Toggle";
import {
  listProfiles,
  createProfile,
  renameProfile,
  deleteProfile,
  setActiveProfile,
  copyBetweenProfiles,
} from "../../shared/lib/profiles";

export default function ProfilesSettings({ onProfileSwitched, showFeedback }) {
  const [profiles, setProfiles] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [newName, setNewName] = useState("");
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [includeAi, setIncludeAi] = useState(false);
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    const { profiles: list, activeId: id } = await listProfiles();
    setProfiles(list);
    setActiveId(id);
    if (!fromId && list[0]) setFromId(list[0].id);
    if (!toId && list[1]) setToId(list[1].id);
  };

  useEffect(() => {
    refresh();
  }, []);

  const notify = (msg, type = "success") => showFeedback?.(msg, type);

  const handleCreate = async () => {
    setBusy(true);
    try {
      await createProfile(newName || "New profile");
      setNewName("");
      await refresh();
      notify("Profile created");
    } catch (e) {
      notify(e.message, "error");
    } finally {
      setBusy(false);
    }
  };

  const handleSwitch = async (id) => {
    if (id === activeId) return;
    setBusy(true);
    try {
      const profile = await setActiveProfile(id);
      setActiveId(id);
      onProfileSwitched?.(profile);
      notify(`Switched to ${profile.name}`);
    } catch (e) {
      notify(e.message, "error");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this profile and all its data?")) return;
    setBusy(true);
    try {
      const result = await deleteProfile(id);
      setProfiles(result.profiles);
      setActiveId(result.activeId);
      const active = result.profiles.find((p) => p.id === result.activeId);
      onProfileSwitched?.(active);
      notify("Profile deleted");
    } catch (e) {
      notify(e.message, "error");
    } finally {
      setBusy(false);
    }
  };

  const handleRename = async (id, name) => {
    await renameProfile(id, name);
    await refresh();
  };

  const handleCopy = async () => {
    if (!fromId || !toId || fromId === toId) {
      return notify("Pick two different profiles", "error");
    }
    setBusy(true);
    try {
      await copyBetweenProfiles(fromId, toId, { includeAi });
      await refresh();
      if (toId === activeId) {
        const { profiles: list } = await listProfiles();
        onProfileSwitched?.(list.find((p) => p.id === activeId));
      }
      notify(includeAi ? "Copied data + AI keys" : "Copied data");
    } catch (e) {
      notify(e.message, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="settings-page cc-profiles">
      <Section title="Profiles" description="Each profile has its own clips, palettes, and AI keys.">
        <ul className="cc-profile-list">
          {profiles.map((p) => (
            <li key={p.id} className={`cc-profile-row ${p.id === activeId ? "is-active" : ""}`}>
              <button type="button" className="cc-profile-select" onClick={() => handleSwitch(p.id)} disabled={busy}>
                <span className="cc-profile-dot" />
                <input
                  className="cc-profile-name"
                  value={p.name}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => {
                    setProfiles((list) =>
                      list.map((x) => (x.id === p.id ? { ...x, name: e.target.value } : x))
                    );
                  }}
                  onBlur={(e) => handleRename(p.id, e.target.value)}
                />
                {p.id === activeId ? <span className="cc-badge">Active</span> : null}
              </button>
              {profiles.length > 1 && (
                <button type="button" className="cc-icon-danger" title="Delete profile" disabled={busy} onClick={() => handleDelete(p.id)}>
                  ×
                </button>
              )}
            </li>
          ))}
        </ul>
        <div className="cc-inline-form">
          <input placeholder="New profile name" value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleCreate()} />
          <ActionButton variant="primary" disabled={busy} onClick={handleCreate}>Add</ActionButton>
        </div>
      </Section>

      <Section title="Copy between profiles" description="Overwrite the target profile’s local data.">
        <Toggle checked={includeAi} onChange={setIncludeAi} label="Include AI credentials" />
        <div className="cc-form-stack">
          <label className="cc-field-label">From</label>
          <select value={fromId} onChange={(e) => setFromId(e.target.value)}>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <label className="cc-field-label">To</label>
          <select value={toId} onChange={(e) => setToId(e.target.value)}>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <ActionButton disabled={busy} onClick={handleCopy}>Copy</ActionButton>
        </div>
      </Section>
    </div>
  );
}

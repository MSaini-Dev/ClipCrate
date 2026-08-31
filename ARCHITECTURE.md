# ClipCrate professional structure

## Folder layout

```
src/
  components/          # Shell UI (Header, menus, thin re-exports)
  features/
    settings/          # ShareSettings (Chrome / Firebase / JSON)
    profiles/          # ProfilesSettings + isolation
  shared/
    ui/                # Toggle, Section, ActionButton
    lib/               # profiles, syncSettings, firebaseSync
  lib/                 # aiProviders, brain (existing)
  storage.js           # existing local storage bridge
```

## UX changes

1. **One AI credentials toggle** at the top of Share & Sync (not 4 buttons per section).
2. Each sync method only has **Push / Pull** (or **Export / Import**).
3. **Profiles** — isolated clips, palettes, AI keys; copy between profiles with optional AI keys.
4. **Privacy lock** remains as a toggle.

## Wire-up in App.jsx

See ARCHITECTURE.md for ProfilesSettings + saveActiveProfileData.

## CSS

Append `public/settings-ui.css` into `public/contentStyle.css`.

## Cleanup candidates

- `src/components/SettingsPopup.jsx` (dead)
- `src/hooks/useClipborad.js` (empty)
- `src/App.css`, `src/index.css` (empty)
- `public/temp.css` (duplicate)
- `response/` notebook

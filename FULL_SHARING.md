# Full sharing

## Features

1. **Chrome Storage Sync** (same Google account)
   - Push / Pull **data only** (clips + palettes)
   - Push / Pull **data + AI credentials**

2. **Firebase Cloud**
   - Use built-in ClipCrate project **or** your own Firebase credentials
   - Push / Pull data only, or data + AI credentials
   - Sync ID + copy button
   - Clear custom credentials → fall back to default

3. **JSON Export / Import**
   - Export / Import data only, or data + AI credentials
   - Works even when cloud sync is blocked

4. **Privacy lock**
   - One button blocks Chrome Sync + Firebase entirely
   - Local storage and JSON still work

## Files
- `src/components/Settings.jsx` — full UI
- `src/lib/syncSettings.js` — preferences (block, firebase mode, custom config)
- `src/lib/firebaseSync.js` — default/custom Firebase init + push/pull
- `src/App.jsx` — passes aiProviders into Settings
- `src/components/SettingsMenu.jsx` — label + about text

Firebase is already a dependency in package.json.

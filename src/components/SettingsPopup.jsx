// src/components/SettingsPopup.jsx
import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export default function SettingsPopup({ onClose, showFeedback }) {
  const [syncKey, setSyncKey] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  // Load saved sync key
  useEffect(() => {
    chrome.storage.local.get(['syncKey', 'userEmail'], (result) => {
      if (result.syncKey) setSyncKey(result.syncKey);
      if (result.userEmail) {
        setUserEmail(result.userEmail);
        setIsLoggedIn(true);
      }
    });
  }, []);

  const handleSaveSyncKey = async () => {
    if (!syncKey.trim()) {
      showFeedback('Please enter a sync key', 'error');
      return;
    }

    setIsSyncing(true);
    setSyncStatus('Saving...');

    try {
      // Save sync key
      await new Promise((resolve) => {
        chrome.storage.local.set({ syncKey: syncKey.trim() }, resolve);
      });

      // Try to sync data
      const result = await new Promise((resolve) => {
        chrome.storage.local.get(['slots', 'palettes'], resolve);
      });

      // Send data to server
      const response = await fetch('https://server-zbr0.onrender.com/api/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          syncKey: syncKey.trim(),
          data: {
            slots: result.slots || [],
            palettes: result.palettes || []
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`Sync failed with status ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        showFeedback('Data synced successfully!', 'success');
        setSyncStatus('Synced successfully!');
        
        // Update user info if available
        if (data.userEmail) {
          setUserEmail(data.userEmail);
          setIsLoggedIn(true);
          chrome.storage.local.set({ userEmail: data.userEmail });
        }
      } else {
        throw new Error(data.message || 'Sync failed');
      }
    } catch (error) {
      console.error('Sync error:', error);
      showFeedback('Sync failed: ' + error.message, 'error');
      setSyncStatus('Sync failed: ' + error.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSignOut = () => {
    chrome.storage.local.remove(['syncKey', 'userEmail'], () => {
      setSyncKey('');
      setUserEmail('');
      setIsLoggedIn(false);
      setSyncStatus('Signed out');
      showFeedback('Signed out successfully', 'success');
    });
  };

  return (
    <div className="settings-popup" style={{
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      zIndex: 1000001,
      maxWidth: '400px',
      width: '90%',
      maxHeight: '80vh',
    }}>
      <div className="settings-header">
        <h3>⚙️ Settings</h3>
        <button className="close-btn" onClick={onClose}>
          <X size={20} />
        </button>
      </div>

      <div className="settings-content">
        {/* Auth Section */}
        <div className="auth-section">
          <h4>Authentication</h4>
          {isLoggedIn ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
              <p style={{ color: 'var(--text-secondary)' }}>
                ✓ Signed in as: <strong>{userEmail}</strong>
              </p>
              <button onClick={handleSignOut} style={{ 
                background: 'var(--danger-bg)',
                color: 'var(--danger-text)',
                border: '1px solid var(--error-border)'
              }}>
                Sign Out
              </button>
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)' }}>
              Sign in with a sync key to backup and restore your data across devices
            </p>
          )}
        </div>

        <div className="line" style={{ margin: '8px 0' }} />

        {/* Sync Section */}
        <div className="sync-section">
          <h4>Sync</h4>
          <input
            type="text"
            placeholder="Enter your sync key"
            value={syncKey}
            onChange={(e) => setSyncKey(e.target.value)}
            disabled={isSyncing || isLoggedIn}
            style={{ 
              width: '100%',
              padding: '8px 12px',
              background: 'var(--surface-bg)',
              border: '1px solid var(--border-primary)',
              borderRadius: '4px',
              color: 'var(--text-primary)'
            }}
          />
          
          <button
            onClick={handleSaveSyncKey}
            disabled={isSyncing || isLoggedIn || !syncKey.trim()}
          >
            {isSyncing ? 'Syncing...' : 'Sync Data'}
          </button>

          {syncStatus && (
            <div className="sync-status">
              <p>{syncStatus}</p>
            </div>
          )}
        </div>

        <div className="line" style={{ margin: '8px 0' }} />

        {/* Info Section */}
        <div style={{ 
          fontSize: 'var(--font-size-xs)',
          color: 'var(--text-muted)',
          padding: '8px 0'
        }}>
          <p>💡 Your data is stored locally and can be synced across devices using a sync key.</p>
          <p style={{ marginTop: '4px' }}>🔒 All data is encrypted during transmission.</p>
        </div>
      </div>
    </div>
  );
}
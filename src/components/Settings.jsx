// src/components/Settings.jsx
import React, { useState, useEffect } from 'react';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, onValue } from 'firebase/database';
import { ChevronLeft } from 'lucide-react';
// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBQtN6LHPfOfMgakLVdFsVUA6lWdvtl2wE",
  authDomain: "clipcrate-18294.firebaseapp.com",
  databaseURL: "https://clipcrate-18294-default-rtdb.firebaseio.com", // ← Add this line
  
  projectId: "clipcrate-18294",
  storageBucket: "clipcrate-18294.appspot.com", // Fixed the storageBucket too
  messagingSenderId: "1024417797137",
  appId: "1:1024417797137:web:b7696ed134c88b156d8db0",
  measurementId: "G-TY87S9EZ73"
};
// Initialize Firebase
// In Settings.jsx
let app;
try {
  app = initializeApp(firebaseConfig);
} catch (err) {
  console.error("Firebase init error:", err);
}

const auth = getAuth(app);
const db = getDatabase(app);
export default function Settings({ 
  slots, 
  colorPalettes, 
  onBack,
  onSyncData
}) {
  const [userId, setUserId] = useState('');
  const [syncId, setSyncId] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState('');
  const [isSignedIn, setIsSignedIn] = useState(false);

  useEffect(() => {
    // Set up auth state listener
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
        setIsSignedIn(true);
      } else {
        setIsSignedIn(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleSignIn = async () => {
    try {
      const userCredential = await signInAnonymously(auth);
      setUserId(userCredential.user.uid);
      setSyncStatus('Signed in anonymously');
    } catch (error) {
      setSyncStatus(`Sign-in error: ${error.message}`);
    }
  };
const handleSyncToCloud = async () => {
  if (!isSignedIn) {
    setSyncStatus('Please sign in first');
    return;
  }

  setIsSyncing(true);
  setSyncStatus('Syncing to cloud...');

  try {
    // Create the data structure Firebase expects
    const syncData = {
      slots: slots || [],
      colorPalettes: colorPalettes || [],
      lastUpdated: Date.now()
    };

    console.log("Attempting to sync:", syncData); // Debug log

    const userRef = ref(db, `users/${userId}`);
    await set(userRef, { data: syncData }); // Note: Changed structure

    // Verify write
    onValue(userRef, (snapshot) => {
      const savedData = snapshot.val();
      console.log("Verification data:", savedData);
      if (savedData?.data) {
        setSyncStatus('Sync successful!');
      } else {
        setSyncStatus('Sync completed but verification failed');
      }
    }, { onlyOnce: true });

  } catch (error) {
    console.error("Full sync error:", error);
    setSyncStatus(`Sync failed: ${error.message}`);
  } finally {
    setIsSyncing(false);
  }
};
  const handleSyncFromCloud = async () => {
  if (!syncId) return;

  setIsSyncing(true);
  setSyncStatus('Syncing from cloud...');

  try {
    const userRef = ref(db, `users/${syncId}`);
    onValue(userRef, (snapshot) => {
      const remoteData = snapshot.val();
      console.log("Received data:", remoteData); // Debug log

      if (remoteData?.data) {
        onSyncData(remoteData.data.slots, remoteData.data.colorPalettes);
        setSyncStatus('Sync successful!');
      } else {
        setSyncStatus('No data found at this location');
      }
    }, { onlyOnce: true });

  } catch (error) {
    setSyncStatus(`Sync failed: ${error.message}`);
  } finally {
    setIsSyncing(false);
  }
};
  const iconProps = {
    size: 16,
    strokeWidth: 1.5
  };
  return (
    <div className="settings-page">


      <div className="settings-content">
        {!isSignedIn ? (
          <div className="auth-section">
            <p>Sign in to enable cloud sync:</p>
            <button onClick={handleSignIn} disabled={isSyncing}>
              Sign In Anonymously
            </button>
          </div>
        ) : (
          <>
            <div className="sync-section">
              <p>Your Sync ID: <code>{userId}</code></p>
              <button 
                onClick={handleSyncToCloud} 
                disabled={isSyncing}
              >
                Sync to Cloud
              </button>
            </div>

            <div className="sync-section">
              <p>Sync from another device:</p>
              <input
                type="text"
                value={syncId}
                onChange={(e) => setSyncId(e.target.value)}
                placeholder="Enter Sync ID"
                disabled={isSyncing}
              />
              <button 
                onClick={handleSyncFromCloud} 
                disabled={isSyncing || !syncId}
              >
                Sync from Cloud
              </button>
            </div>
          </>
        )}

        <div className="sync-status">
          {syncStatus && <p>{syncStatus}</p>}
        </div>
      </div>
    </div>
  );
}
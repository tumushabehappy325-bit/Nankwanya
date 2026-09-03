/**
 * Firebase Client SDK Initialization & Real-Time Sync
 */

import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, onSnapshot, query, orderBy, where } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || ''
};

let app = null;
let db = null;
let auth = null;
let isFirebaseActive = false;

if (firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.apiKey !== 'YOUR_FIREBASE_API_KEY') {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    db = getFirestore(app);
    auth = getAuth(app);
    isFirebaseActive = true;
    console.log('[Firebase Client] Successfully initialized Firebase Cloud Firestore SDK.');
  } catch (err) {
    console.warn('[Firebase Client] Initialization note:', err.message);
  }
} else {
  console.log('[Firebase Client] Running with integrated live REST polling / local sync mode.');
}

/**
 * Subscribe to real-time updates for a collection or fallback to fast polling
 */
export function subscribeToCollection(collectionName, callback, filter = {}) {
  if (isFirebaseActive && db) {
    try {
      let q = collection(db, collectionName);
      if (filter.whereField && filter.whereValue) {
        q = query(q, where(filter.whereField, '==', filter.whereValue));
      }
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(data);
      }, (err) => {
        console.warn(`[Firestore listener error for ${collectionName}]:`, err.message);
      });
      return unsubscribe;
    } catch (e) {
      console.warn('[Firestore subscribe fallback]:', e.message);
    }
  }

  // Fallback fast polling (every 2.5s) for live responsiveness when running without Firebase API keys
  let isCancelled = false;
  const poll = async () => {
    if (isCancelled) return;
    try {
      let url = `/api/${collectionName}`;
      if (collectionName === 'bloodRequests') url = '/api/requests';
      const queryParams = new URLSearchParams();
      if (filter.whereField && filter.whereValue) {
        queryParams.append(filter.whereField, filter.whereValue);
      }
      const res = await fetch(`${url}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`);
      const json = await res.json();
      if (json.success) {
        const items = json[collectionName] || json.requests || json.alerts || json.donors || json.facilities || [];
        callback(items);
      }
    } catch (e) {
      // ignore transient poll error
    }
  };

  poll();
  const intervalId = setInterval(poll, 2500);

  return () => {
    isCancelled = true;
    clearInterval(intervalId);
  };
}

export { app, db, auth, isFirebaseActive };

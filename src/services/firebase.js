import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAxPyExuVn3oRmun4xRwKvJ_MMTAgGVWow",
  authDomain: "pawguard-ee74c.firebaseapp.com",
  projectId: "pawguard-ee74c",
  storageBucket: "pawguard-ee74c.firebasestorage.app",
  messagingSenderId: "697373184312",
  appId: "1:697373184312:web:af57ab587244f963a171cd"
};

// CRITICAL FIX: Check if Firebase is already initialized
let app;
let db;
let auth;

// Initialize Firebase only once
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
  console.log('🔥 Firebase app initialized');
} else {
  app = getApps()[0];
  console.log('🔥 Firebase app already initialized');
}

db = getFirestore(app);
auth = getAuth(app);

let authReady = false;
let authReadyPromise = null;

// Helper function to ensure auth is ready before making Firestore calls
export const waitForAuth = async () => {
  if (authReady) return true;
  if (authReadyPromise) {
    return await authReadyPromise;
  }
  return false;
};

export const initializeFirebase = async () => {
  // Prevent multiple simultaneous initialization attempts
  if (authReadyPromise) {
    console.log('⏳ Firebase auth already initializing...');
    return await authReadyPromise;
  }

  // Auto sign-in anonymously for API access
  authReadyPromise = new Promise((resolve) => {
    signInAnonymously(auth)
      .then(() => {
        console.log('✅ Firebase initialized with anonymous auth');
        authReady = true;
        resolve({ app, db, auth });
      })
      .catch((error) => {
        console.error('⚠️ Firebase auth error (non-critical):', error.message);
        // Still resolve to allow app to continue
        authReady = true;
        resolve({ app, db, auth });
      });
  });

  return await authReadyPromise;
};

// Export initialized instances (safe to import)
export { app, db, auth };

import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAxPyExuVn3oRmun4xRwKvJ_MMTAgGVWow",
  authDomain: "pawguard-ee74c.firebaseapp.com",
  projectId: "pawguard-ee74c",
  storageBucket: "pawguard-ee74c.firebasestorage.app",
  messagingSenderId: "697373184312",
  appId: "1:697373184312:web:af57ab587244f963a171cd"
};

let app;
let db;
let auth;
let authReady = false;
let authReadyPromise = null;

export const initializeFirebase = async () => {
  if (!app) {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
    
    // Create a promise that resolves when auth is ready
    authReadyPromise = new Promise((resolve) => {
      // Auto sign-in anonymously for API access
      signInAnonymously(auth)
        .then(() => {
          console.log('✅ Firebase initialized with anonymous auth');
          authReady = true;
          resolve(true);
        })
        .catch((error) => {
          console.error('Firebase auth error:', error);
          // Still resolve to allow app to continue
          authReady = true;
          resolve(false);
        });
    });
    
    // Wait for auth to be ready
    await authReadyPromise;
  }
  return { app, db, auth };
};

// Helper function to ensure auth is ready before making Firestore calls
export const waitForAuth = async () => {
  if (authReady) return true;
  if (authReadyPromise) {
    return await authReadyPromise;
  }
  return false;
};

export { app, db, auth };
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

// Initialize Firebase immediately
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

let authReady = false;
let authReadyPromise = null;

// Auto sign-in anonymously for API access
authReadyPromise = new Promise((resolve) => {
  signInAnonymously(auth)
    .then(() => {
      console.log('✅ Firebase initialized with anonymous auth');
      authReady = true;
      resolve(true);
    })
    .catch((error) => {
      console.error('⚠️ Firebase auth error (non-critical):', error);
      // Still resolve to allow app to continue
      authReady = true;
      resolve(false);
    });
});

// Helper function to ensure auth is ready before making Firestore calls
export const waitForAuth = async () => {
  if (authReady) return true;
  if (authReadyPromise) {
    return await authReadyPromise;
  }
  return false;
};

export const initializeFirebase = async () => {
  // Wait for auth to complete
  await authReadyPromise;
  console.log('✅ Firebase initialization complete');
  return { app, db, auth };
};

// Export initialized instances (safe to import)
export { app, db, auth };

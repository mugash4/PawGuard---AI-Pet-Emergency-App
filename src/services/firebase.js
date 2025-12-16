import { initializeApp } from 'firebase/app';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAxPyExuVn3oRmun4xRwKvJ_MMTAgGVWow",
  authDomain: "pawguard-ee74c.firebaseapp.com",
  projectId: "pawguard-ee74c",
  storageBucket: "pawguard-ee74c.firebasestorage.app",
  messagingSenderId: "697373184312",
  appId: "1:697373184312:web:af57ab587244f963a171cd"
};

// Initialize Firebase
console.log('🔥 Initializing Firebase...');
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

let authReady = false;
let authReadyResolve;
let authReadyReject;

// Create promise for auth readiness
const authReadyPromise = new Promise((resolve, reject) => {
  authReadyResolve = resolve;
  authReadyReject = reject;
});

// Auto sign-in anonymously
console.log('🔐 Signing in anonymously...');
signInAnonymously(auth)
  .then(() => {
    console.log('✅ Firebase anonymous auth successful');
    authReady = true;
    if (authReadyResolve) authReadyResolve(true);
  })
  .catch((error) => {
    console.error('⚠️ Firebase auth error (non-critical):', error.message);
    authReady = true; // Allow app to continue
    if (authReadyResolve) authReadyResolve(false);
  });

// Enable offline persistence (optional but recommended)
if (typeof window !== 'undefined') {
  enableIndexedDbPersistence(db)
    .then(() => {
      console.log('✅ Firebase offline persistence enabled');
    })
    .catch((err) => {
      if (err.code === 'failed-precondition') {
        console.warn('⚠️ Multiple tabs open, persistence disabled');
      } else if (err.code === 'unimplemented') {
        console.warn('⚠️ Browser does not support persistence');
      }
    });
}

/**
 * Wait for authentication to be ready
 * @returns {Promise<boolean>} True if auth succeeded, false if failed (but app can continue)
 */
export const waitForAuth = async () => {
  if (authReady) return true;
  
  try {
    const result = await Promise.race([
      authReadyPromise,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Auth timeout')), 10000)
      )
    ]);
    return result;
  } catch (error) {
    console.warn('⚠️ Auth wait timeout, continuing anyway');
    return false;
  }
};

/**
 * Initialize Firebase (compatibility function)
 */
export const initializeFirebase = async () => {
  await waitForAuth();
  console.log('✅ Firebase initialization complete');
  return { app, db, auth };
};

// Export initialized instances
export { app, db, auth };

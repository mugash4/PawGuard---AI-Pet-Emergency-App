import { initializeApp } from 'firebase/app';
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

let app;
let db;
let auth;

export const initializeFirebase = async () => {
  if (!app) {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
    
    // Auto sign-in anonymously for API access
    try {
      await signInAnonymously(auth);
      console.log('✅ Firebase initialized with anonymous auth');
    } catch (error) {
      console.error('Firebase auth error:', error);
    }
  }
  return { app, db, auth };
};

export { app, db, auth };

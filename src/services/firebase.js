import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import { getStorage } from 'firebase/storage';
import { getAuth } from 'firebase/auth';

// Firebase configuration
// IMPORTANT: Replace these with your actual Firebase project credentials
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
let functions;
let storage;
let auth;

export const initializeFirebase = () => {
  if (!app) {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    functions = getFunctions(app);
    storage = getStorage(app);
    auth = getAuth(app);
    
    console.log('✅ Firebase initialized successfully');
  }
  return { app, db, functions, storage, auth };
};

export { app, db, functions, storage, auth };

import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Check if Firebase is actually configured or just has placeholder values
const isFirebaseConfigured = 
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY !== "placeholder" && 
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY !== undefined;

// Initialize Firebase if it's properly configured
let app;
let auth;
let db;
let storage;

if (isFirebaseConfigured) {
  try {
    app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
  } catch (error) {
    console.error("Firebase initialization error:", error);
    // Provide stub/mock values for Firebase services
    app = null;
    auth = null;
    db = null;
    storage = null;
  }
} else {
  // Provide stub/mock values for Firebase services
  app = null;
  auth = null;
  db = null;
  storage = null;
}

export { app, auth, db, storage };

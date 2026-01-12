import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";

// Use Environment Variables
// Note: In Vite, we use import.meta.env instead of process.env
// We configured vite.config.ts to accept REACT_APP_ prefix

// Fix: Cast import.meta to any to resolve TypeScript error 'Property env does not exist on type ImportMeta'
const env = (import.meta as any).env;

const firebaseConfig = {
  apiKey: env.REACT_APP_FIREBASE_API_KEY,
  authDomain: env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.REACT_APP_FIREBASE_APP_ID
};

// Fallback for development if env vars are missing (Optional safety check)
if (!firebaseConfig.apiKey) {
  console.warn("Firebase Env Vars missing. App may not function correctly.");
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Enable Offline Persistence (Web)
try {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn("Persistence failed: Multiple tabs open.");
    } else if (err.code === 'unimplemented') {
      console.warn("Persistence not supported by browser.");
    }
  });
} catch (error) {
  console.log("Persistence setup skipped");
}

export default app;
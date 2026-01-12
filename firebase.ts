import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";

// Access Vite Environment Variables
// We cast import.meta to 'any' to avoid TS errors without a specific declaration file
const env = (import.meta as any).env;

const firebaseConfig = {
  apiKey: env.REACT_APP_FIREBASE_API_KEY,
  authDomain: env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.REACT_APP_FIREBASE_APP_ID
};

// Safety check for development
if (!firebaseConfig.apiKey) {
  console.warn("⚠️ Firebase Env Vars missing. Check your .env file or hosting settings.");
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Enable Offline Persistence (Web)
// This ensures the app works intermittently offline
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
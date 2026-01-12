import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";

// Fix for missing types when vite/client is not available
declare global {
  interface ImportMeta {
    env: any;
  }
}

// Access Vite Environment Variables directly.
// Note: We access import.meta.env.VAR_NAME directly to allow Vite to statically replace them at build time.
// Assigning import.meta.env to a variable or casting it can break this replacement.

const firebaseConfig = {
  apiKey: import.meta.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: import.meta.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.REACT_APP_FIREBASE_APP_ID
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
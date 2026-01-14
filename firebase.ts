import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";

// Using hardcoded configuration to ensure API keys are present
const firebaseConfig = {
  apiKey: "AIzaSyCM-EB3uSqgrdM3VLjRwt_2eyYlkchMHyk",
  authDomain: "chargesafe-4f1c4.firebaseapp.com",
  projectId: "chargesafe-4f1c4",
  storageBucket: "chargesafe-4f1c4.firebasestorage.app",
  messagingSenderId: "821380918544",
  appId: "1:821380918544:web:832cde7d865540cff78995"
};

// Initialize Firebase
let app;
try {
  app = initializeApp(firebaseConfig);
} catch (error) {
  console.error("Firebase Initialization Error:", error);
  throw error;
}

export const auth = getAuth(app);
export const db = getFirestore(app);

// Enable Offline Persistence (Web)
// This helps the app work when network is flaky
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
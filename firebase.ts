import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCM-EB3uSqgrdM3VLjRwt_2eyYlkchMHyk",
  authDomain: "chargesafe-4f1c4.firebaseapp.com",
  projectId: "chargesafe-4f1c4",
  storageBucket: "chargesafe-4f1c4.firebasestorage.app",
  messagingSenderId: "821380918544",
  appId: "1:821380918544:web:832cde7d865540cff78995"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Enable Offline Persistence (Web)
// We wrap this in a try-catch and simple promise handling to ensure it doesn't crash the app on unsupported browsers.
try {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn("Multiple tabs open, persistence can only be enabled in one tab at a a time.");
    } else if (err.code === 'unimplemented') {
      console.warn("The current browser does not support all of the features required to enable persistence.");
    }
  });
} catch (error) {
  // Ignore errors during persistence initialization to keep the app running
  console.log("Persistence not enabled");
}

export default app;
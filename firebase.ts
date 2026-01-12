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

// Enable Offline Persistence
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code == 'failed-precondition') {
    // Multiple tabs open, persistence can only be enabled in one tab at a a time.
    console.warn('Persistence failed: Multiple tabs open');
  } else if (err.code == 'unimplemented') {
    // The current browser does not support all of the features required to enable persistence
    console.warn('Persistence not supported in this browser');
  }
});

export default app;
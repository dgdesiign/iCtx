import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: "gen-lang-client-0531276266.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: "gen-lang-client-0531276266.firebasestorage.app",
  messagingSenderId: "549227667726",
  appId: "1:549227667726:web:2a0297db9856e446c5f75f"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

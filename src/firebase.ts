import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDzxje8PRLZlvvuBk8fI7aOm_5ZzLmMeHo",
  authDomain: "menuflow-c02e5.firebaseapp.com",
  projectId: "menuflow-c02e5",
  storageBucket: "menuflow-c02e5.firebasestorage.app",
  messagingSenderId: "958824525746",
  appId: "1:958824525746:web:83207f591dcacc1b647eab"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
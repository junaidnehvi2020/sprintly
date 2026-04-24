// Import the functions you need from the SDKs you need
import { getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBOZ6yUMiU_SMY_LGbQOYX9JMEsxX3Yw9I",
  authDomain: "studio-2645670114-5471b.firebaseapp.com",
  projectId: "studio-2645670114-5471b",
  storageBucket: "studio-2645670114-5471b.firebasestorage.app",
  messagingSenderId: "482808459572",
  appId: "1:482808459572:web:21b1a20d09c27282983561"
};

// Initialize Firebase safely, preventing re-initialization on hot reloads
let firebase_app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Get references to the services you need
const db = getFirestore(firebase_app);
const auth = getAuth(firebase_app);

export { firebase_app, db, auth };

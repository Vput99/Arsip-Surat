
import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "AIzaSyAb5Mo3x56YF_kz_NjVmz46sWN096nDsZM",
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || "surat-sd.firebaseapp.com",
  projectId: process.env.FIREBASE_PROJECT_ID || "surat-sd",
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "surat-sd.firebasestorage.app",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "182905923814",
  appId: process.env.FIREBASE_APP_ID || "1:182905923814:web:c7f868614167a6ed5ff327"
};

// Initialize Firebase only once
let app;
if (!getApps().length) {
  try {
    app = initializeApp(firebaseConfig);
    console.log("Firebase App Initialized Successfully");
  } catch (e) {
    console.error("Firebase Initialization Error:", e);
  }
} else {
  app = getApps()[0];
}

export const db = getFirestore(app!);

export const COLLECTIONS = {
  CONFIG: 'school_config',
  STAFF: 'staff',
  TEMPLATES: 'letter_templates'
};

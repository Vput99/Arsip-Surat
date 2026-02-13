
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "AIzaSyAb5Mo3x56YF_kz_NjVmz46sWN096nDsZM",
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || "surat-sd.firebaseapp.com",
  projectId: process.env.FIREBASE_PROJECT_ID || "surat-sd",
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "surat-sd.firebasestorage.app",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "182905923814",
  appId: process.env.FIREBASE_APP_ID || "1:182905923814:web:c7f868614167a6ed5ff327"
};

// Initialize Firebase
// Check if config is valid to avoid crash loop
let app;
try {
  app = initializeApp(firebaseConfig);
} catch (e) {
  console.error("Firebase init failed (Cek .env):", e);
}

export const db = app ? getFirestore(app) : getFirestore(); // Fallback if init fails

export const COLLECTIONS = {
  CONFIG: 'school_config',
  STAFF: 'staff',
  TEMPLATES: 'letter_templates'
};

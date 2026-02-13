import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAb5Mo3x56YF_kz_NjVmz46sWN096nDsZM",
  authDomain: "surat-sd.firebaseapp.com",
  projectId: "surat-sd",
  storageBucket: "surat-sd.firebasestorage.app",
  messagingSenderId: "182905923814",
  appId: "1:182905923814:web:c7f868614167a6ed5ff327"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

export const COLLECTIONS = {
  CONFIG: 'school_config',
  STAFF: 'staff',
  TEMPLATES: 'letter_templates'
};
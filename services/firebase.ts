import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// --- KONFIGURASI FIREBASE ---
// Jika muncul error "permission-denied" atau "Cloud Firestore API has not been used":
// 1. Buka https://console.firebase.google.com/
// 2. Pilih Project "surat-sd"
// 3. Masuk menu "Build" -> "Firestore Database"
// 4. Klik "Create Database"
// 5. Pilih "Start in Test Mode" (Penting agar tidak perlu setup rules dulu)
// 6. Pilih lokasi server (misal: asia-southeast2 untuk Jakarta/Indonesia)

const firebaseConfig = {
  apiKey: "AIzaSyAb5Mo3x56YF_kz_NjVmz46sWN096nDsZM",
  authDomain: "surat-sd.firebaseapp.com",
  projectId: "surat-sd",
  storageBucket: "surat-sd.firebasestorage.app",
  messagingSenderId: "182905923814",
  appId: "1:182905923814:web:c7f868614167a6ed5ff327"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Collection Names
export const COLLECTIONS = {
  MAILS: 'mails',
  CONFIG: 'school_config'
};
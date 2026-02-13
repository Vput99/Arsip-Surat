
import { createClient } from "@libsql/client/web";

// Credentials Hardcoded dari input user
const RAW_URL = "libsql://arsip-surat-vput99.aws-ap-northeast-1.turso.io";
const AUTH_TOKEN = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJnaWQiOiI1M2JmYzBmYy01Yzc1LTQ0MTktYmIzNi0zM2RkNTMxYzFmZDQiLCJpYXQiOjE3NzA5NTMyNDIsInJpZCI6ImZjMzE2ZDVjLTlhYjAtNDY2ZC1hMGUyLTJjYmQ3MzZiYzIxMyJ9.z-1IctIEns0dc17jWTwJWgOf0LmfB3qciT_fc_EXsSsRTP8QaRr7JDz5ilf0d6p8oIng1DM8OkYLzluG_cx0Dw";

// Web client harus menggunakan https://, bukan libsql://
const dbUrl = RAW_URL.startsWith("libsql://") 
  ? RAW_URL.replace("libsql://", "https://") 
  : RAW_URL;

console.log("Initializing Turso Client with URL:", dbUrl);

export const turso = createClient({
  url: dbUrl,
  authToken: AUTH_TOKEN,
});

export const isTursoConfigured = () => true;

export const initTables = async () => {
  console.log("Turso: Memulai inisialisasi tabel...");
  try {
    // 1. Cek koneksi dasar
    await turso.execute("SELECT 1");
    console.log("Turso: Ping berhasil.");

    // 2. Buat tabel jika belum ada
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS mails (
        id TEXT PRIMARY KEY,
        type TEXT,
        referenceNumber TEXT,
        date TEXT,
        receivedDate TEXT,
        createdAt TEXT,
        sender TEXT,
        subject TEXT,
        description TEXT,
        fileUrl TEXT,
        category TEXT,
        urgency TEXT,
        status TEXT,
        aiSummary TEXT
      )
    `);
    console.log("Turso: Tabel 'mails' siap.");
  } catch (e: any) {
    console.error("Turso Init Error:", e);
    // Log pesan error yang lebih jelas untuk debugging
    if (e.message.includes("401")) {
      console.error("Turso Error: Unauthorized. Cek Token.");
    } else if (e.message.includes("404")) {
      console.error("Turso Error: Database tidak ditemukan. Cek URL.");
    }
  }
};

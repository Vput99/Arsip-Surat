import { createClient } from "@libsql/client/web";

// Menggunakan Token yang diberikan sebagai fallback jika environment variable kosong
const rawUrl = process.env.TURSO_DATABASE_URL || "libsql://arsip-surat-vput99.aws-ap-northeast-1.turso.io";
const authToken = process.env.TURSO_AUTH_TOKEN || "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJnaWQiOiI1M2JmYzBmYy01Yzc1LTQ0MTktYmIzNi0zM2RkNTMxYzFmZDQiLCJpYXQiOjE3NzA1MTU2MjcsInJpZCI6ImZjMzE2ZDVjLTlhYjAtNDY2ZC1hMGUyLTJjYmQ3MzZiYzIxMyJ9.5qtEGpdmXXQy4mpFWmUNmu_TVWTqs67UiCZrwJZwsl9YPG5zTUvmyFPjCmYpgqavrzAPEzi3gT6ZgV1NFX3tDQ";

// Penting: Browser SDK memerlukan protokol https:// (bukan libsql://)
const url = rawUrl.startsWith("libsql://") 
  ? rawUrl.replace("libsql://", "https://") 
  : rawUrl;

export const isTursoConfigured = () => {
  return !!url && url.length > 10;
};

// Inisialisasi Client
export const turso = isTursoConfigured() 
  ? createClient({ url, authToken })
  : null;

export const initTables = async () => {
  if (!turso) {
    console.error("Turso client GAGAL inisialisasi: URL tidak valid.");
    return;
  }

  try {
    console.log(`Mencoba koneksi ke Turso: ${url}`);
    
    // Tes koneksi sederhana
    await turso.execute("SELECT 1");
    
    // Batch pembuatan tabel
    await turso.batch([
      `CREATE TABLE IF NOT EXISTS mails (
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
      )`,
      `CREATE TABLE IF NOT EXISTS school_config (
        id TEXT PRIMARY KEY,
        name TEXT,
        address TEXT,
        email TEXT,
        headerLine1 TEXT,
        headerLine2 TEXT,
        logoUrl TEXT,
        logoDaerahUrl TEXT
      )`
    ], "write");
    
    console.log("Database Turso Berhasil Terhubung dan Inisialisasi.");
  } catch (e: any) {
    const errorMsg = e instanceof Error ? e.message : String(e);
    console.error("Koneksi Turso Gagal:", errorMsg);
    
    if (errorMsg.includes("Failed to fetch")) {
      console.error(
        "DIAGNOSA ERROR:\n" +
        "1. Pastikan Database Turso anda berstatus 'Active'.\n" +
        "2. Jika menggunakan Vercel, pastikan TURSO_AUTH_TOKEN sudah dimasukkan di Environment Variables.\n" +
        "3. Token JWT yang anda berikan telah dipasang sebagai fallback."
      );
    }
  }
};
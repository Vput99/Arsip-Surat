import { createClient } from "@libsql/client/web";

const rawUrl = process.env.TURSO_DATABASE_URL || "libsql://arsip-surat-vput99.aws-ap-northeast-1.turso.io";
const authToken = process.env.TURSO_AUTH_TOKEN || "";

// Konversi protokol untuk kecocokan browser SDK
const url = rawUrl.replace("libsql://", "https://");

export const isTursoConfigured = () => {
  // Tetap anggap terkonfigurasi jika URL ada, meskipun token kosong (untuk testing/public DB)
  return url !== "" && !url.includes("default-db.turso.io");
};

export const turso = isTursoConfigured() 
  ? createClient({ url, authToken })
  : null;

export const initTables = async () => {
  if (!turso) return;

  try {
    // Gunakan batch untuk efisiensi inisialisasi
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
    console.log("Turso Realtime Database initialized.");
  } catch (e) {
    console.error("Turso Initialization failed:", e);
  }
};
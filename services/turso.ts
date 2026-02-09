import { createClient } from "@libsql/client/web";

const rawUrl = process.env.TURSO_DATABASE_URL || "libsql://arsip-surat-vput99.aws-ap-northeast-1.turso.io";
const authToken = process.env.TURSO_AUTH_TOKEN || "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJnaWQiOiI1M2JmYzBmYy01Yzc1LTQ0MTktYmIzNi0zM2RkNTMxYzFmZDQiLCJpYXQiOjE3NzA1MTU2MjcsInJpZCI6ImZjMzE2ZDVjLTlhYjAtNDY2ZC1hMGUyLTJjYmQ3MzZiYzIxMyJ9.5qtEGpdmXXQy4mpFWmUNmu_TVWTqs67UiCZrwJZwsl9YPG5zTUvmyFPjCmYpgqavrzAPEzi3gT6ZgV1NFX3tDQ";

const url = rawUrl && rawUrl.startsWith("libsql://") 
  ? rawUrl.replace("libsql://", "https://") 
  : rawUrl;

export const isTursoConfigured = () => {
  return !!url && url.length > 10;
};

export const turso = isTursoConfigured() 
  ? createClient({ url, authToken })
  : null;

export const initTables = async () => {
  if (!turso) return;

  try {
    await turso.execute("SELECT 1");
    
    // 1. Inisialisasi Tabel Dasar
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

    // 2. Patching Kolom Baru (Migration)
    // SQLite tidak mendukung ADD COLUMN IF NOT EXISTS secara langsung, 
    // maka kita coba satu per satu dalam try-catch
    try {
      await turso.execute("ALTER TABLE school_config ADD COLUMN principalName TEXT");
    } catch (e) { /* Kolom mungkin sudah ada */ }

    try {
      await turso.execute("ALTER TABLE school_config ADD COLUMN principalNip TEXT");
    } catch (e) { /* Kolom mungkin sudah ada */ }
    
    console.log("Database Turso: Inisialisasi & Migrasi Berhasil.");
  } catch (e: any) {
    console.error("Koneksi Turso Gagal:", e.message);
  }
};
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
    // Gunakan timeout singkat untuk tes koneksi agar tidak hang
    const testPromise = turso.execute("SELECT 1");
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 5000));
    
    await Promise.race([testPromise, timeoutPromise]);
    
    // Inisialisasi Tabel
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
        npsn TEXT,
        headerLine1 TEXT,
        headerLine2 TEXT,
        logoUrl TEXT,
        logoDaerahUrl TEXT,
        principalName TEXT,
        principalNip TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS staff (
        id TEXT PRIMARY KEY,
        category TEXT,
        name TEXT,
        nip TEXT,
        rank TEXT,
        orderIndex INTEGER DEFAULT 9999,
        createdAt TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS letter_templates (
        id TEXT PRIMARY KEY,
        name TEXT,
        subject TEXT,
        category TEXT,
        layout TEXT,
        content TEXT,
        createdAt TEXT
      )`
    ], "write");

    console.log("Database Turso: Sinkronisasi Aktif.");
  } catch (e: any) {
    // Jangan lempar error ke UI, cukup log dan biarkan storage.ts menangani fallback
    console.warn("Database Cloud tidak terjangkau (Mode Offline Aktif):", e.message);
  }
};

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
    console.log("Turso: Tabel Mails siap.");
  } catch (e: any) {
    console.warn("Turso Init Error:", e.message);
  }
};

import { createClient } from "@libsql/client/web";

/**
 * Konfigurasi Turso Database.
 */
const rawUrl = process.env.TURSO_DATABASE_URL || "";
const authToken = process.env.TURSO_AUTH_TOKEN || "";

// Bersihkan URL agar kompatibel dengan lingkungan web (fetch)
// Browser memerlukan https:// untuk HRANA protocol jika menggunakan @libsql/client/web
const url = rawUrl.replace("libsql://", "https://");

export const isTursoConfigured = () => {
  return url !== "" && url !== "https://default-db.turso.io" && authToken !== "";
};

export const turso = isTursoConfigured() 
  ? createClient({ url, authToken })
  : null;

/**
 * Inisialisasi Tabel SQL secara aman
 */
export const initTables = async () => {
  if (!turso) {
    console.warn("Turso not configured. Using local storage only.");
    return;
  }

  try {
    await turso.batch([
      // Tabel Mails
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
      // Tabel Config
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
    console.log("Turso Tables Ready");
  } catch (e) {
    console.error("Turso Initialization Error (Check CORS or Token):", e);
  }
};
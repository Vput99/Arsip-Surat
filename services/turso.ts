import { createClient } from "@libsql/client/web";

/**
 * Konfigurasi Turso Database.
 * Menggunakan URL yang diberikan oleh user sebagai fallback jika env var tidak ada.
 */
const rawUrl = process.env.TURSO_DATABASE_URL || "libsql://arsip-surat-vput99.aws-ap-northeast-1.turso.io";
const authToken = process.env.TURSO_AUTH_TOKEN || "";

/**
 * Penting: @libsql/client/web membutuhkan protokol https:// atau wss://
 * Kita konversi libsql:// menjadi https:// untuk kompatibilitas browser (HRANA protocol)
 */
const url = rawUrl.replace("libsql://", "https://");

export const isTursoConfigured = () => {
  // Database dianggap terkonfigurasi jika URL bukan default kosong dan token tersedia
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
    console.warn("Turso not fully configured (Missing Auth Token). Using local storage only.");
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
    console.log("Turso Database connected and tables are ready.");
  } catch (e) {
    console.error("Turso Connection Error. Please check your Auth Token and Network:", e);
  }
};
import { turso, initTables, isTursoConfigured } from './turso';
import { Mail, SchoolConfig } from '../types';
import { MOCK_INITIAL_DATA } from '../constants';

// Inisialisasi tabel saat file di-import (Akan mengecek konfigurasi internal)
initTables();

// Default Config (Fallback)
const DEFAULT_CONFIG: SchoolConfig = {
  name: 'SD NEGERI TEMPUREJO 1',
  address: 'Jl. Raya Tempurejo No. 12 Kec. Pesantren Kota Kediri',
  email: 'admin@sdntempurejo1.sch.id',
  headerLine1: 'PEMERINTAH KOTA KEDIRI',
  headerLine2: 'DINAS PENDIDIKAN',
  logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/9/9c/Logo_Tut_Wuri_Handayani.svg',
  logoDaerahUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Logo_Kota_Kediri.png/900px-Logo_Kota_Kediri.png'
};

// --- CONNECTION STATE MANAGEMENT ---
let isDatabaseConnected = false; 
const connectionListeners: ((isConnected: boolean) => void)[] = [];

export const subscribeToConnectionStatus = (callback: (isConnected: boolean) => void) => {
  connectionListeners.push(callback);
  callback(isDatabaseConnected);
  return () => {
    const index = connectionListeners.indexOf(callback);
    if (index > -1) connectionListeners.splice(index, 1);
  };
};

const setConnectionStatus = (status: boolean) => {
  if (isDatabaseConnected !== status) {
    isDatabaseConnected = status;
    connectionListeners.forEach(cb => cb(status));
  }
};

// --- LOCAL STORAGE HELPERS (OFFLINE MODE) ---
const getLocalMails = (): Mail[] => {
  try {
    const saved = localStorage.getItem('OFFLINE_MAILS');
    return saved ? JSON.parse(saved) : MOCK_INITIAL_DATA;
  } catch {
    return MOCK_INITIAL_DATA;
  }
};

const getLocalConfig = (): SchoolConfig => {
  try {
    const saved = localStorage.getItem('OFFLINE_CONFIG');
    return saved ? JSON.parse(saved) : DEFAULT_CONFIG;
  } catch {
    return DEFAULT_CONFIG;
  }
};

// Listeners Aktif
let mailListeners: ((mails: Mail[]) => void)[] = [];
let configListeners: ((config: SchoolConfig) => void)[] = [];

// --- TURSO FETCHERS ---

const fetchAllMails = async () => {
  if (!turso) return;
  try {
    const rs = await turso.execute("SELECT * FROM mails ORDER BY createdAt DESC");
    const mails = rs.rows.map(row => ({ ...row } as unknown as Mail));
    
    // Sync ke LocalStorage
    localStorage.setItem('OFFLINE_MAILS', JSON.stringify(mails));
    mailListeners.forEach(l => l(mails));
    setConnectionStatus(true);
  } catch (e) {
    console.warn("Turso Fetch Mails Failed:", e);
    setConnectionStatus(false);
  }
};

const fetchConfig = async () => {
  if (!turso) return;
  try {
    const rs = await turso.execute("SELECT * FROM school_config WHERE id = 'main_settings'");
    if (rs.rows.length > 0) {
      const config = rs.rows[0] as unknown as SchoolConfig;
      localStorage.setItem('OFFLINE_CONFIG', JSON.stringify(config));
      configListeners.forEach(l => l(config));
    } else {
      // Inisialisasi jika kosong
      await saveSchoolConfig(getLocalConfig());
    }
    setConnectionStatus(true);
  } catch (e) {
    console.warn("Turso Fetch Config Failed:", e);
    setConnectionStatus(false);
  }
};

// --- REALTIME SUBSCRIPTIONS ---

export const subscribeToMails = (onData: (mails: Mail[]) => void) => {
  mailListeners.push(onData);
  onData(getLocalMails());
  
  if (isTursoConfigured()) {
    fetchAllMails();
    const interval = setInterval(fetchAllMails, 5000);
    return () => {
      clearInterval(interval);
      mailListeners = mailListeners.filter(l => l !== onData);
    };
  }
  return () => { mailListeners = mailListeners.filter(l => l !== onData); };
};

export const subscribeToConfig = (onData: (config: SchoolConfig) => void) => {
  configListeners.push(onData);
  onData(getLocalConfig());

  if (isTursoConfigured()) {
    fetchConfig();
    const interval = setInterval(fetchConfig, 30000);
    return () => {
      clearInterval(interval);
      configListeners = configListeners.filter(l => l !== onData);
    };
  }
  return () => { configListeners = configListeners.filter(l => l !== onData); };
};

// --- ACTIONS (SQL) ---

export const saveMail = async (mail: Mail): Promise<void> => {
  const mailId = mail.id || Date.now().toString();
  const mailToSave = { ...mail, id: mailId };

  // 1. Optimistic Update (UI Instan)
  const currentMails = getLocalMails();
  const existingIdx = currentMails.findIndex(m => m.id === mailId);
  let newMails;
  if (existingIdx >= 0) {
    newMails = [...currentMails];
    newMails[existingIdx] = mailToSave;
  } else {
    newMails = [mailToSave, ...currentMails];
  }
  localStorage.setItem('OFFLINE_MAILS', JSON.stringify(newMails));
  mailListeners.forEach(l => l(newMails));

  // 2. Turso Save (Background)
  if (turso) {
    try {
      await turso.execute({
        sql: `INSERT OR REPLACE INTO mails (
          id, type, referenceNumber, date, receivedDate, createdAt, 
          sender, subject, description, fileUrl, category, urgency, status, aiSummary
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          mailToSave.id, mailToSave.type, mailToSave.referenceNumber, mailToSave.date, 
          mailToSave.receivedDate, mailToSave.createdAt, mailToSave.sender, 
          mailToSave.subject, mailToSave.description, mailToSave.fileUrl || null, 
          mailToSave.category, mailToSave.urgency, mailToSave.status, mailToSave.aiSummary || null
        ]
      });
      setConnectionStatus(true);
    } catch (e) {
      console.error("Turso Save Failed:", e);
      setConnectionStatus(false);
    }
  }
};

export const deleteMail = async (id: string): Promise<void> => {
  // 1. Local
  const currentMails = getLocalMails();
  const newMails = currentMails.filter(m => m.id !== id);
  localStorage.setItem('OFFLINE_MAILS', JSON.stringify(newMails));
  mailListeners.forEach(l => l(newMails));

  // 2. Turso
  if (turso) {
    try {
      await turso.execute({
        sql: "DELETE FROM mails WHERE id = ?",
        args: [id]
      });
      setConnectionStatus(true);
    } catch (e) {
      console.error("Turso Delete Failed:", e);
      setConnectionStatus(false);
    }
  }
};

export const saveSchoolConfig = async (config: SchoolConfig): Promise<void> => {
  // 1. Local
  localStorage.setItem('OFFLINE_CONFIG', JSON.stringify(config));
  configListeners.forEach(l => l(config));

  // 2. Turso
  if (turso) {
    try {
      await turso.execute({
        sql: `INSERT OR REPLACE INTO school_config (
          id, name, address, email, headerLine1, headerLine2, logoUrl, logoDaerahUrl
        ) VALUES ('main_settings', ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          config.name, config.address, config.email, config.headerLine1, 
          config.headerLine2, config.logoUrl, config.logoDaerahUrl
        ]
      });
      setConnectionStatus(true);
    } catch (e) {
      console.error("Turso Config Save Failed:", e);
      setConnectionStatus(false);
    }
  }
};

// --- BACKUP & RESTORE ---

export const exportDatabase = async (): Promise<string> => {
  const mails = getLocalMails();
  const config = getLocalConfig();
  const backup = {
    version: 2,
    timestamp: new Date().toISOString(),
    mails,
    configs: [config]
  };
  return JSON.stringify(backup, null, 2);
};

export const importDatabase = async (jsonString: string): Promise<boolean> => {
  try {
    const data = JSON.parse(jsonString);
    if (data.mails) {
      for (const m of data.mails) await saveMail(m);
    }
    if (data.configs && data.configs[0]) {
      await saveSchoolConfig(data.configs[0]);
    }
    return true;
  } catch (e) {
    console.error("Import failed:", e);
    return false;
  }
};
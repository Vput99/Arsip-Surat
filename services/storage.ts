import { Mail, SchoolConfig } from '../types';
import { MOCK_INITIAL_DATA } from '../constants';

const STORAGE_KEY = 'arsip_surat_db_v1';
const CONFIG_KEY = 'arsip_surat_config_v1';

// Default Config
const DEFAULT_CONFIG: SchoolConfig = {
  name: 'SD NEGERI TEMPUREJO 1',
  address: 'Jl. Raya Tempurejo No. 12 Kec. Pesantren Kota Kediri',
  email: 'admin@sdntempurejo1.sch.id',
  headerLine1: 'PEMERINTAH KOTA KEDIRI',
  headerLine2: 'DINAS PENDIDIKAN',
  logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/9/9c/Logo_Tut_Wuri_Handayani.svg', // Logo Sekolah (Kanan)
  logoDaerahUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Logo_Kota_Kediri.png/900px-Logo_Kota_Kediri.png' // Logo Daerah (Kiri)
};

// Initialize DB if empty
const initDB = () => {
  if (typeof window === 'undefined') return;
  
  // Mail Data
  const existing = localStorage.getItem(STORAGE_KEY);
  if (!existing) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(MOCK_INITIAL_DATA));
  }

  // Config Data
  const existingConfig = localStorage.getItem(CONFIG_KEY);
  if (!existingConfig) {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(DEFAULT_CONFIG));
  } else {
    // Migration for existing config that might miss new fields
    const parsed = JSON.parse(existingConfig);
    if (!parsed.headerLine1 || !parsed.logoDaerahUrl) {
       localStorage.setItem(CONFIG_KEY, JSON.stringify({ ...DEFAULT_CONFIG, ...parsed }));
    }
  }
};

initDB();

// --- MAIL FUNCTIONS ---

export const getMails = (): Mail[] => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveMail = (mail: Mail): void => {
  const mails = getMails();
  const index = mails.findIndex(m => m.id === mail.id);
  if (index >= 0) {
    mails[index] = mail;
  } else {
    mails.unshift(mail); // Add to top
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(mails));
  window.dispatchEvent(new Event('storage-update'));
};

export const deleteMail = (id: string): void => {
  const mails = getMails();
  const newMails = mails.filter(m => m.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(newMails));
  window.dispatchEvent(new Event('storage-update'));
};

export const getStats = () => {
  const mails = getMails();
  return {
    total: mails.length,
    incoming: mails.filter(m => m.type === 'Masuk').length,
    outgoing: mails.filter(m => m.type === 'Keluar').length,
    urgent: mails.filter(m => m.urgency === 'Segera').length
  };
};

// --- CONFIG FUNCTIONS ---

export const getSchoolConfig = (): SchoolConfig => {
  const data = localStorage.getItem(CONFIG_KEY);
  return data ? JSON.parse(data) : DEFAULT_CONFIG;
};

export const saveSchoolConfig = (config: SchoolConfig): void => {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  window.dispatchEvent(new Event('config-update'));
};

// --- EXPORT/IMPORT ---

export const exportDatabase = (): string => {
  const mails = localStorage.getItem(STORAGE_KEY);
  const config = localStorage.getItem(CONFIG_KEY);
  return JSON.stringify({
    mails: mails ? JSON.parse(mails) : [],
    config: config ? JSON.parse(config) : DEFAULT_CONFIG
  });
};

export const importDatabase = (jsonString: string): boolean => {
  try {
    const parsed = JSON.parse(jsonString);
    // Support legacy array format or new object format
    if (Array.isArray(parsed)) {
       localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
    } else if (parsed.mails && Array.isArray(parsed.mails)) {
       localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed.mails));
       if (parsed.config) {
         localStorage.setItem(CONFIG_KEY, JSON.stringify(parsed.config));
       }
    } else {
      return false;
    }
    
    window.dispatchEvent(new Event('storage-update'));
    window.dispatchEvent(new Event('config-update'));
    return true;
  } catch (e) {
    console.error("Invalid JSON format", e);
    return false;
  }
};
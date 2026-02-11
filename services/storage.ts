import { turso, initTables, isTursoConfigured } from './turso';
import { Mail, SchoolConfig } from '../types';
import { MOCK_INITIAL_DATA, LETTER_TEMPLATES } from '../constants';

if (isTursoConfigured()) {
  initTables().catch(console.error);
}

export interface StaffMember {
  id: string;
  category: string;
  name: string;
  nip: string;
  rank: string;
  orderIndex?: number;
  createdAt?: string;
}

export interface LetterTemplate {
  id: string;
  name: string;
  subject: string;
  category: string;
  layout: string;
  content: string;
  createdAt: string;
}

const DEFAULT_CONFIG: SchoolConfig = {
  name: 'SD NEGERI TEMPUREJO 1',
  address: 'Jl. Raya Tempurejo No. 12 Kec. Pesantren Kota Kediri',
  email: 'admin@sdntempurejo1.sch.id',
  npsn: '20534567',
  headerLine1: 'PEMERINTAH KOTA KEDIRI',
  headerLine2: 'DINAS PENDIDIKAN',
  logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/9/9c/Logo_Tut_Wuri_Handayani.svg',
  logoDaerahUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Logo_Kota_Kediri.png/900px-Logo_Kota_Kediri.png',
  principalName: 'Nita Ekaningkarti Adji, S.Pd',
  principalNip: '19860213 201409 2 002'
};

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

// --- LETTER TEMPLATES ---
let templateListeners: ((templates: LetterTemplate[]) => void)[] = [];

export const subscribeToTemplates = (onData: (templates: LetterTemplate[]) => void) => {
  templateListeners.push(onData);
  
  const fetchTemplates = async () => {
    if (!turso) return;
    try {
      const rs = await turso.execute("SELECT * FROM letter_templates ORDER BY createdAt ASC");
      let templates = rs.rows.map(row => ({ ...row } as unknown as LetterTemplate));
      
      if (templates.length === 0) {
        for (const t of LETTER_TEMPLATES) {
          const newT = { ...t, createdAt: new Date().toISOString() };
          await saveTemplate(newT as any);
        }
        return fetchTemplates();
      }
      
      onData(templates);
      setConnectionStatus(true);
    } catch (e) {
      setConnectionStatus(false);
    }
  };

  fetchTemplates();
  const interval = setInterval(fetchTemplates, isDatabaseConnected ? 20000 : 60000);
  return () => {
    clearInterval(interval);
    templateListeners = templateListeners.filter(l => l !== onData);
  };
};

export const saveTemplate = async (template: LetterTemplate): Promise<void> => {
  if (!turso) return;
  try {
    await turso.execute({
      sql: `INSERT OR REPLACE INTO letter_templates (id, name, subject, category, layout, content, createdAt) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [template.id, template.name, template.subject, template.category, template.layout, template.content, template.createdAt]
    });
    setConnectionStatus(true);
  } catch (e) {
    setConnectionStatus(false);
  }
};

export const deleteTemplate = async (id: string): Promise<void> => {
  if (!turso) return;
  try {
    await turso.execute({
      sql: "DELETE FROM letter_templates WHERE id = ?",
      args: [id]
    });
    setConnectionStatus(true);
  } catch (e) {
    setConnectionStatus(false);
  }
};

// --- STAFF MANAGEMENT ---
let staffListeners: ((staff: StaffMember[]) => void)[] = [];

export const subscribeToStaff = (onData: (staff: StaffMember[]) => void) => {
  staffListeners.push(onData);
  
  const fetchStaff = async () => {
    if (!turso) return;
    try {
      const rs = await turso.execute("SELECT * FROM staff ORDER BY orderIndex ASC, createdAt ASC");
      const staff = rs.rows.map(row => ({ ...row } as unknown as StaffMember));
      onData(staff);
      setConnectionStatus(true);
    } catch (e) {
      setConnectionStatus(false);
    }
  };

  fetchStaff();
  const interval = setInterval(fetchStaff, isDatabaseConnected ? 10000 : 60000);
  return () => {
    clearInterval(interval);
    staffListeners = staffListeners.filter(l => l !== onData);
  };
};

export const saveStaff = async (member: StaffMember): Promise<void> => {
  if (!turso) return;
  const createdTime = member.createdAt || new Date().toISOString();
  const orderIdx = member.orderIndex !== undefined ? member.orderIndex : 9999;
  try {
    await turso.execute({
      sql: `INSERT OR REPLACE INTO staff (id, category, name, nip, rank, orderIndex, createdAt) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [member.id, member.category, member.name, member.nip, member.rank, orderIdx, createdTime]
    });
    setConnectionStatus(true);
  } catch (e) {
    setConnectionStatus(false);
  }
};

export const deleteStaff = async (id: string): Promise<void> => {
  if (!turso) return;
  try {
    await turso.execute({
      sql: "DELETE FROM staff WHERE id = ?",
      args: [id]
    });
    setConnectionStatus(true);
  } catch (e) {
    setConnectionStatus(false);
  }
};

// --- MAIL & CONFIG ---
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

let mailListeners: ((mails: Mail[]) => void)[] = [];
let configListeners: ((config: SchoolConfig) => void)[] = [];

const fetchAllMails = async () => {
  if (!turso) return;
  try {
    const rs = await turso.execute("SELECT * FROM mails ORDER BY createdAt DESC");
    const mails = rs.rows.map(row => ({ ...row } as unknown as Mail));
    localStorage.setItem('OFFLINE_MAILS', JSON.stringify(mails));
    mailListeners.forEach(l => l(mails));
    setConnectionStatus(true);
    console.log("Cloud Sync: Mails fetched from Turso successfully.");
  } catch (e) {
    setConnectionStatus(false);
    console.warn("Cloud Sync: Failed to fetch mails from Turso.");
  }
};

const fetchConfig = async () => {
  if (!turso) return;
  try {
    const rs = await turso.execute("SELECT * FROM school_config WHERE id = 'main_settings'");
    if (rs.rows.length > 0) {
      const config = rs.rows[0] as unknown as any;
      const mappedConfig: SchoolConfig = {
        name: config.name || DEFAULT_CONFIG.name,
        address: config.address || DEFAULT_CONFIG.address,
        email: config.email || DEFAULT_CONFIG.email,
        npsn: config.npsn || DEFAULT_CONFIG.npsn,
        headerLine1: config.headerLine1 || DEFAULT_CONFIG.headerLine1,
        headerLine2: config.headerLine2 || DEFAULT_CONFIG.headerLine2,
        logoUrl: config.logoUrl || DEFAULT_CONFIG.logoUrl,
        logoDaerahUrl: config.logoDaerahUrl || DEFAULT_CONFIG.logoDaerahUrl,
        principalName: config.principalName || DEFAULT_CONFIG.principalName,
        principalNip: config.principalNip || DEFAULT_CONFIG.principalNip,
      };
      localStorage.setItem('OFFLINE_CONFIG', JSON.stringify(mappedConfig));
      configListeners.forEach(l => l(mappedConfig));
      setConnectionStatus(true);
    } else {
      await saveSchoolConfig(getLocalConfig());
    }
  } catch (e) {
    setConnectionStatus(false);
  }
};

export const subscribeToMails = (onData: (mails: Mail[]) => void) => {
  mailListeners.push(onData);
  onData(getLocalMails());
  if (isTursoConfigured()) {
    fetchAllMails();
    const interval = setInterval(fetchAllMails, isDatabaseConnected ? 5000 : 30000);
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
    const interval = setInterval(fetchConfig, 60000);
    return () => {
      clearInterval(interval);
      configListeners = configListeners.filter(l => l !== onData);
    };
  }
  return () => { configListeners = configListeners.filter(l => l !== onData); };
};

export const saveMail = async (mail: Mail): Promise<void> => {
  const mailId = mail.id || Date.now().toString();
  const mailToSave = { ...mail, id: mailId };
  
  // Update Local State First
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

  // Push to Turso
  if (turso) {
    try {
      console.log(`Cloud Sync: Saving mail ${mailId} to Turso...`);
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
      console.log("Cloud Sync: Mail saved to Turso successfully.");
    } catch (e: any) {
      setConnectionStatus(false);
      console.error("Cloud Sync Error: Failed to save to Turso.", e.message);
      // Data remains in localStorage, will sync on next fetch/refresh if connection restored
    }
  } else {
    console.warn("Cloud Sync: Turso not configured, saving only to local storage.");
  }
};

export const deleteMail = async (id: string): Promise<void> => {
  const currentMails = getLocalMails();
  const newMails = currentMails.filter(m => m.id !== id);
  localStorage.setItem('OFFLINE_MAILS', JSON.stringify(newMails));
  mailListeners.forEach(l => l(newMails));
  if (turso) {
    try {
      await turso.execute({
        sql: "DELETE FROM mails WHERE id = ?",
        args: [id]
      });
      setConnectionStatus(true);
    } catch (e) {
      setConnectionStatus(false);
    }
  }
};

export const saveSchoolConfig = async (config: SchoolConfig): Promise<void> => {
  localStorage.setItem('OFFLINE_CONFIG', JSON.stringify(config));
  configListeners.forEach(l => l(config));
  if (turso) {
    try {
      await turso.execute({
        sql: `INSERT OR REPLACE INTO school_config (
          id, name, address, email, npsn, headerLine1, headerLine2, logoUrl, logoDaerahUrl, principalName, principalNip
        ) VALUES ('main_settings', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          config.name, config.address, config.email, config.npsn, config.headerLine1, 
          config.headerLine2, config.logoUrl, config.logoDaerahUrl,
          config.principalName, config.principalNip
        ]
      });
      setConnectionStatus(true);
    } catch (e: any) {
      setConnectionStatus(false);
      console.warn("Sinkronisasi config ke cloud gagal, data tersimpan secara lokal.");
    }
  }
};

export const exportDatabase = async (): Promise<string> => {
  const mails = getLocalMails();
  const config = getLocalConfig();
  const backup = { version: 2, timestamp: new Date().toISOString(), mails, configs: [config] };
  return JSON.stringify(backup, null, 2);
};

export const importDatabase = async (jsonString: string): Promise<boolean> => {
  try {
    const data = JSON.parse(jsonString);
    if (data.mails) { for (const m of data.mails) await saveMail(m); }
    if (data.configs && data.configs[0]) { await saveSchoolConfig(data.configs[0]); }
    return true;
  } catch (e) { return false; }
};
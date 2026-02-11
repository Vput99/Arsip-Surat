
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

// --- SUBSCRIPTIONS ---
let templateListeners: ((templates: LetterTemplate[]) => void)[] = [];
let mailListeners: ((mails: Mail[]) => void)[] = [];
let configListeners: ((config: SchoolConfig) => void)[] = [];
let staffListeners: ((staff: StaffMember[]) => void)[] = [];

// Fetchers
const fetchTemplates = async () => {
  if (!turso) return;
  try {
    const rs = await turso.execute("SELECT * FROM letter_templates ORDER BY createdAt ASC");
    let templates = rs.rows.map(row => ({ ...row } as unknown as LetterTemplate));
    if (templates.length === 0) {
      for (const t of LETTER_TEMPLATES) {
        await saveTemplate({ ...t, createdAt: new Date().toISOString() } as any);
      }
      return fetchTemplates();
    }
    templateListeners.forEach(l => l(templates));
    setConnectionStatus(true);
  } catch (e) { setConnectionStatus(false); }
};

const fetchMails = async () => {
  if (!turso) return;
  try {
    const rs = await turso.execute("SELECT * FROM mails ORDER BY createdAt DESC");
    const mails = rs.rows.map(row => ({ ...row } as unknown as Mail));
    try { localStorage.setItem('OFFLINE_MAILS', JSON.stringify(mails)); } catch(e) {}
    mailListeners.forEach(l => l(mails));
    setConnectionStatus(true);
  } catch (e) { setConnectionStatus(false); }
};

const fetchStaff = async () => {
  if (!turso) return;
  try {
    const rs = await turso.execute("SELECT * FROM staff ORDER BY orderIndex ASC, createdAt ASC");
    const staff = rs.rows.map(row => ({ ...row } as unknown as StaffMember));
    staffListeners.forEach(l => l(staff));
    setConnectionStatus(true);
  } catch (e) { setConnectionStatus(false); }
};

// Public Subscriptions
export const subscribeToTemplates = (onData: (templates: LetterTemplate[]) => void) => {
  templateListeners.push(onData);
  fetchTemplates();
  const interval = setInterval(fetchTemplates, isDatabaseConnected ? 30000 : 60000);
  return () => { clearInterval(interval); templateListeners = templateListeners.filter(l => l !== onData); };
};

export const subscribeToMails = (onData: (mails: Mail[]) => void) => {
  mailListeners.push(onData);
  const local = localStorage.getItem('OFFLINE_MAILS');
  if (local) onData(JSON.parse(local));
  fetchMails();
  const interval = setInterval(fetchMails, isDatabaseConnected ? 15000 : 45000);
  return () => { clearInterval(interval); mailListeners = mailListeners.filter(l => l !== onData); };
};

export const subscribeToStaff = (onData: (staff: StaffMember[]) => void) => {
  staffListeners.push(onData);
  fetchStaff();
  const interval = setInterval(fetchStaff, isDatabaseConnected ? 20000 : 60000);
  return () => { clearInterval(interval); staffListeners = staffListeners.filter(l => l !== onData); };
};

export const subscribeToConfig = (onData: (config: SchoolConfig) => void) => {
  configListeners.push(onData);
  const local = localStorage.getItem('OFFLINE_CONFIG');
  onData(local ? JSON.parse(local) : DEFAULT_CONFIG);
  
  const fetchConfig = async () => {
    if (!turso) return;
    try {
      const rs = await turso.execute("SELECT * FROM school_config WHERE id = 'main_settings'");
      if (rs.rows.length > 0) {
        const config = rs.rows[0] as unknown as SchoolConfig;
        localStorage.setItem('OFFLINE_CONFIG', JSON.stringify(config));
        configListeners.forEach(l => l(config));
      }
    } catch (e) {}
  };
  fetchConfig();
  const interval = setInterval(fetchConfig, 60000);
  return () => { clearInterval(interval); configListeners = configListeners.filter(l => l !== onData); };
};

// Savers
export const saveMail = async (mail: Mail): Promise<void> => {
  // 1. Local Cache
  const current = JSON.parse(localStorage.getItem('OFFLINE_MAILS') || '[]');
  const index = current.findIndex((m: any) => m.id === mail.id);
  const next = index >= 0 ? current.map((m: any, i: number) => i === index ? mail : m) : [mail, ...current];
  
  try { localStorage.setItem('OFFLINE_MAILS', JSON.stringify(next)); } catch(e) {
    // If quota exceeded, save metadata only in local
    const meta = next.map((m: any) => m.id === mail.id ? { ...m, fileUrl: '[CLOUD_ONLY]' } : m);
    try { localStorage.setItem('OFFLINE_MAILS', JSON.stringify(meta)); } catch(e2) {}
  }
  
  mailListeners.forEach(l => l(next));

  // 2. Cloud Save
  if (turso) {
    await turso.execute({
      sql: `INSERT OR REPLACE INTO mails (id, type, referenceNumber, date, receivedDate, createdAt, sender, subject, description, fileUrl, category, urgency, status, aiSummary) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [mail.id, mail.type, mail.referenceNumber, mail.date, mail.receivedDate, mail.createdAt, mail.sender, mail.subject, mail.description, mail.fileUrl || null, mail.category, mail.urgency, mail.status, mail.aiSummary || null]
    });
  }
};

// Delete a mail record from local cache and cloud database
export const deleteMail = async (id: string): Promise<void> => {
  // 1. Local Cache
  const current = JSON.parse(localStorage.getItem('OFFLINE_MAILS') || '[]');
  const next = current.filter((m: any) => m.id !== id);
  localStorage.setItem('OFFLINE_MAILS', JSON.stringify(next));
  mailListeners.forEach(l => l(next));

  // 2. Cloud Delete
  if (turso) {
    await turso.execute({
      sql: "DELETE FROM mails WHERE id = ?",
      args: [id]
    });
  }
};

export const saveStaff = async (member: StaffMember): Promise<void> => {
  if (turso) {
    await turso.execute({
      sql: `INSERT OR REPLACE INTO staff (id, category, name, nip, rank, orderIndex, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [member.id, member.category, member.name, member.nip, member.rank, member.orderIndex || 9999, member.createdAt || new Date().toISOString()]
    });
    fetchStaff();
  }
};

export const deleteStaff = async (id: string): Promise<void> => {
  if (turso) {
    await turso.execute({ sql: "DELETE FROM staff WHERE id = ?", args: [id] });
    fetchStaff();
  }
};

export const saveTemplate = async (t: LetterTemplate): Promise<void> => {
  if (turso) {
    await turso.execute({
      sql: `INSERT OR REPLACE INTO letter_templates (id, name, subject, category, layout, content, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [t.id, t.name, t.subject, t.category, t.layout, t.content, t.createdAt]
    });
    fetchTemplates();
  }
};

export const deleteTemplate = async (id: string): Promise<void> => {
  if (turso) {
    await turso.execute({ sql: "DELETE FROM letter_templates WHERE id = ?", args: [id] });
    fetchTemplates();
  }
};

export const saveSchoolConfig = async (config: SchoolConfig): Promise<void> => {
  localStorage.setItem('OFFLINE_CONFIG', JSON.stringify(config));
  if (turso) {
    await turso.execute({
      sql: `INSERT OR REPLACE INTO school_config (id, name, address, email, npsn, headerLine1, headerLine2, logoUrl, logoDaerahUrl, principalName, principalNip) VALUES ('main_settings', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [config.name, config.address, config.email, config.npsn, config.headerLine1, config.headerLine2, config.logoUrl, config.logoDaerahUrl, config.principalName, config.principalNip]
    });
  }
};


import { turso, initTables, isTursoConfigured } from './turso';
import { db, COLLECTIONS } from './firebase';
import { 
  collection, 
  doc, 
  getDoc,
  onSnapshot, 
  query, 
  orderBy, 
  setDoc, 
  deleteDoc,
  enableNetwork,
  disableNetwork
} from "firebase/firestore";
import { Mail, SchoolConfig } from '../types';
import { LETTER_TEMPLATES } from '../constants';

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
  name: 'SD NEGERI CONTOH',
  address: 'Jl. Pendidikan No. 123',
  email: 'admin@sekolah.sch.id',
  npsn: '12345678',
  headerLine1: 'PEMERINTAH KOTA KEDIRI',
  headerLine2: 'DINAS PENDIDIKAN',
  logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/9/9c/Logo_Tut_Wuri_Handayani.svg',
  logoDaerahUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Logo_Kota_Kediri.png/900px-Logo_Kota_Kediri.png',
  principalName: 'Nama Kepala Sekolah, S.Pd',
  principalNip: '19800101 200501 1 001'
};

// --- STATUS TRACKING ---
let isTursoConnected = false;
let isFirebaseConnected = false;
const connectionListeners: ((status: { turso: boolean, firebase: boolean }) => void)[] = [];

const updateStatus = (turso?: boolean, firebase?: boolean) => {
  let changed = false;
  if (turso !== undefined && isTursoConnected !== turso) {
    isTursoConnected = turso;
    changed = true;
  }
  if (firebase !== undefined && isFirebaseConnected !== firebase) {
    isFirebaseConnected = firebase;
    changed = true;
  }
  
  if (changed) {
    connectionListeners.forEach(cb => cb({ turso: isTursoConnected, firebase: isFirebaseConnected }));
  }
};

// Fungsi untuk memaksa cek koneksi (Ping)
export const forceCheckConnections = async () => {
  // 1. Cek Turso (SQL Archive)
  if (turso) {
    try {
      await turso.execute("SELECT 1");
      await initTables();
      updateStatus(true, undefined);
    } catch (e) {
      console.error("Turso Ping Failed:", e);
      updateStatus(false, undefined);
    }
  }

  // 2. Cek Firebase (Real-time Sync)
  try {
    await enableNetwork(db); // Pastikan network aktif
    const docRef = doc(db, COLLECTIONS.CONFIG, "main_settings");
    const snap = await getDoc(docRef);
    // Jika bisa melakukan getDoc, berarti terkoneksi
    updateStatus(undefined, true);
    return { turso: isTursoConnected, firebase: true };
  } catch (e) {
    console.error("Firebase Ping Failed:", e);
    updateStatus(undefined, false);
    return { turso: isTursoConnected, firebase: false };
  }
};

export const subscribeToConnectionStatus = (callback: (status: { turso: boolean, firebase: boolean }) => void) => {
  connectionListeners.push(callback);
  callback({ turso: isTursoConnected, firebase: isFirebaseConnected });
  return () => {
    const index = connectionListeners.indexOf(callback);
    if (index > -1) connectionListeners.splice(index, 1);
  };
};

// --- TURSO: MAILS ---
let mailListeners: ((mails: Mail[]) => void)[] = [];

const fetchMails = async () => {
  if (!turso) return;
  try {
    const rs = await turso.execute("SELECT * FROM mails ORDER BY createdAt DESC");
    const mails = rs.rows.map(row => ({ ...row } as unknown as Mail));
    mailListeners.forEach(l => l(mails));
    updateStatus(true);
  } catch (e) { 
    updateStatus(false); 
  }
};

export const subscribeToMails = (onData: (mails: Mail[]) => void) => {
  mailListeners.push(onData);
  fetchMails();
  const interval = setInterval(fetchMails, 10000); 
  return () => { 
    clearInterval(interval); 
    mailListeners = mailListeners.filter(l => l !== onData); 
  };
};

export const saveMail = async (mail: Mail): Promise<void> => {
  if (!turso) throw new Error("Database SQL Offline");
  await turso.execute({
    sql: `INSERT OR REPLACE INTO mails (id, type, referenceNumber, date, receivedDate, createdAt, sender, subject, description, fileUrl, category, urgency, status, aiSummary) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [mail.id, mail.type, mail.referenceNumber, mail.date, mail.receivedDate, mail.createdAt, mail.sender, mail.subject, mail.description, mail.fileUrl || null, mail.category, mail.urgency, mail.status, mail.aiSummary || null]
  });
  fetchMails();
};

export const deleteMail = async (id: string): Promise<void> => {
  if (turso) {
    await turso.execute({ sql: "DELETE FROM mails WHERE id = ?", args: [id] });
    fetchMails();
  }
};

// --- FIREBASE: STAFF & CONFIG ---

export const subscribeToStaff = (onData: (staff: StaffMember[]) => void) => {
  const q = query(collection(db, "staff"), orderBy("orderIndex", "asc"));
  return onSnapshot(q, (snapshot) => {
    const staff = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StaffMember));
    onData(staff);
    updateStatus(undefined, true);
  }, (err) => {
    updateStatus(undefined, false);
    onData([]); 
  });
};

export const saveStaff = async (member: StaffMember): Promise<void> => {
  await setDoc(doc(db, "staff", member.id), { ...member }, { merge: true });
};

export const deleteStaff = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, "staff", id));
};

export const subscribeToConfig = (onData: (config: SchoolConfig) => void) => {
  const configRef = doc(db, COLLECTIONS.CONFIG, "main_settings");
  return onSnapshot(configRef, (docSnap) => {
    if (docSnap.exists()) {
      onData(docSnap.data() as SchoolConfig);
    } else {
      onData(DEFAULT_CONFIG);
      saveSchoolConfig(DEFAULT_CONFIG).catch(() => {});
    }
    updateStatus(undefined, true);
  }, (err) => {
    updateStatus(undefined, false);
    onData(DEFAULT_CONFIG);
  });
};

export const saveSchoolConfig = async (config: SchoolConfig): Promise<void> => {
  await setDoc(doc(db, COLLECTIONS.CONFIG, "main_settings"), config);
};

export const subscribeToTemplates = (onData: (templates: LetterTemplate[]) => void) => {
  const q = query(collection(db, "letter_templates"), orderBy("createdAt", "asc"));
  return onSnapshot(q, (snapshot) => {
    let templates = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LetterTemplate));
    if (templates.length === 0) {
      const defaults = LETTER_TEMPLATES.map(t => ({...t, createdAt: new Date().toISOString()})) as LetterTemplate[];
      templates = defaults;
      defaults.forEach(t => saveTemplate(t).catch(() => {}));
    }
    onData(templates);
    updateStatus(undefined, true);
  }, (err) => {
    updateStatus(undefined, false);
  });
};

export const saveTemplate = async (t: LetterTemplate): Promise<void> => {
  await setDoc(doc(db, "letter_templates", t.id), { ...t });
};

export const deleteTemplate = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, "letter_templates", id));
};

// Initial check
forceCheckConnections();

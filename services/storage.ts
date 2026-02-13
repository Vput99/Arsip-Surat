
import { turso, initTables, isTursoConfigured } from './turso';
import { db, COLLECTIONS } from './firebase';
import { doc, onSnapshot, setDoc, collection, query, orderBy, deleteDoc, getDocs } from "firebase/firestore";
import { Mail, SchoolConfig } from '../types';
import { LETTER_TEMPLATES } from '../constants';

// Inisialisasi Tabel Turso untuk Mails
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

export const subscribeToConnectionStatus = (callback: (status: { turso: boolean, firebase: boolean }) => void) => {
  connectionListeners.push(callback);
  callback({ turso: isTursoConnected, firebase: isFirebaseConnected });
  return () => {
    const index = connectionListeners.indexOf(callback);
    if (index > -1) connectionListeners.splice(index, 1);
  };
};

const updateStatus = (turso?: boolean, firebase?: boolean) => {
  if (turso !== undefined) isTursoConnected = turso;
  if (firebase !== undefined) isFirebaseConnected = firebase;
  connectionListeners.forEach(cb => cb({ turso: isTursoConnected, firebase: isFirebaseConnected }));
};

// --- TURSO: MAILS (SQL ARCHIVE) ---
let mailListeners: ((mails: Mail[]) => void)[] = [];

const fetchMails = async () => {
  if (!turso) return;
  try {
    const rs = await turso.execute("SELECT * FROM mails ORDER BY createdAt DESC");
    const mails = rs.rows.map(row => ({ ...row } as unknown as Mail));
    mailListeners.forEach(l => l(mails));
    updateStatus(true);
  } catch (e) { 
    console.error("Turso Fetch Error:", e);
    updateStatus(false); 
  }
};

export const subscribeToMails = (onData: (mails: Mail[]) => void) => {
  mailListeners.push(onData);
  fetchMails();
  const interval = setInterval(fetchMails, 15000); 
  return () => { 
    clearInterval(interval); 
    mailListeners = mailListeners.filter(l => l !== onData); 
  };
};

export const saveMail = async (mail: Mail): Promise<void> => {
  if (turso) {
    await turso.execute({
      sql: `INSERT OR REPLACE INTO mails (id, type, referenceNumber, date, receivedDate, createdAt, sender, subject, description, fileUrl, category, urgency, status, aiSummary) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [mail.id, mail.type, mail.referenceNumber, mail.date, mail.receivedDate, mail.createdAt, mail.sender, mail.subject, mail.description, mail.fileUrl || null, mail.category, mail.urgency, mail.status, mail.aiSummary || null]
    });
    fetchMails();
  }
};

export const deleteMail = async (id: string): Promise<void> => {
  if (turso) {
    await turso.execute({ sql: "DELETE FROM mails WHERE id = ?", args: [id] });
    fetchMails();
  }
};

// --- FIREBASE: STAFF & CONFIG (REAL-TIME SYNC) ---

export const subscribeToStaff = (onData: (staff: StaffMember[]) => void) => {
  const q = query(collection(db, "staff"), orderBy("orderIndex", "asc"));
  return onSnapshot(q, (snapshot) => {
    const staff = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StaffMember));
    onData(staff);
    updateStatus(undefined, true);
  }, (err) => {
    console.error("Firebase Staff Error:", err);
    updateStatus(undefined, false);
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
      saveSchoolConfig(DEFAULT_CONFIG);
    }
    updateStatus(undefined, true);
  }, () => updateStatus(undefined, false));
};

export const saveSchoolConfig = async (config: SchoolConfig): Promise<void> => {
  await setDoc(doc(db, COLLECTIONS.CONFIG, "main_settings"), config);
};

// Sinkronisasi Template secara Real-time
export const subscribeToTemplates = (onData: (templates: LetterTemplate[]) => void) => {
  const q = query(collection(db, "letter_templates"), orderBy("createdAt", "asc"));
  return onSnapshot(q, (snapshot) => {
    let templates = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LetterTemplate));
    // Jika data template di Firebase kosong, inisialisasi dari konstanta lokal
    if (templates.length === 0) {
      LETTER_TEMPLATES.forEach(t => {
        saveTemplate({ ...t, createdAt: new Date().toISOString() } as any);
      });
    }
    onData(templates);
  });
};

export const saveTemplate = async (t: LetterTemplate): Promise<void> => {
  await setDoc(doc(db, "letter_templates", t.id), { ...t });
};

export const deleteTemplate = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, "letter_templates", id));
};

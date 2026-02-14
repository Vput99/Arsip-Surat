
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
  deleteDoc
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
  name: 'SD NEGERI TEMPUREJO 1',
  address: 'Jl. Raya Tempurejo No.12 Kecamatan Pesantren Kota Kediri',
  email: 'admin.sd@sdntempurejokotakediri.my.id',
  npsn: '20534296',
  headerLine1: 'PEMERINTAH KOTA KEDIRI',
  headerLine2: 'DINAS PENDIDIKAN',
  logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/9/9c/Logo_Tut_Wuri_Handayani.svg',
  logoDaerahUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Logo_Kota_Kediri.png/900px-Logo_Kota_Kediri.png',
  principalName: 'Nita Ekaningkarti Adji, S.Pd',
  principalNip: '19860213 201409 2 002'
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

export const forceCheckConnections = async () => {
  if (turso) {
    try {
      await turso.execute("SELECT 1");
      await initTables();
      updateStatus(true, undefined);
    } catch (e) {
      updateStatus(false, undefined);
    }
  }

  try {
    // Cukup lakukan read operation untuk cek koneksi, tidak perlu enableNetwork manual
    const docRef = doc(db, COLLECTIONS.CONFIG, "main_settings");
    await getDoc(docRef);
    updateStatus(undefined, true);
    return { turso: isTursoConnected, firebase: true };
  } catch (e) {
    console.error("Firebase check failed:", e);
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

// Fungsi untuk mengisi data awal ke Firebase secara paksa
export const initializeDefaultData = async () => {
  try {
    // 1. Simpan Config Sekolah
    await setDoc(doc(db, COLLECTIONS.CONFIG, "main_settings"), DEFAULT_CONFIG);
    
    // 2. Simpan Template Default
    for (const t of LETTER_TEMPLATES) {
      const templateData: LetterTemplate = {
        ...t,
        createdAt: new Date().toISOString()
      };
      await setDoc(doc(db, "letter_templates", t.id), templateData);
    }
    
    return true;
  } catch (e) {
    console.error("Initialization failed:", e);
    throw e;
  }
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
  
  // Pastikan kolom disposition ada di tabel (migrasi sederhana saat runtime)
  try {
    await turso.execute("ALTER TABLE mails ADD COLUMN disposition TEXT");
  } catch (e) {
    // Kolom mungkin sudah ada, abaikan error
  }

  await turso.execute({
    sql: `INSERT OR REPLACE INTO mails (id, type, referenceNumber, date, receivedDate, createdAt, sender, subject, description, fileUrl, category, urgency, status, aiSummary, disposition) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      mail.id, mail.type, mail.referenceNumber, mail.date, mail.receivedDate, mail.createdAt, 
      mail.sender, mail.subject, mail.description, mail.fileUrl || null, mail.category, 
      mail.urgency, mail.status, mail.aiSummary || null, mail.disposition || null
    ]
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
    }
    updateStatus(undefined, true);
  }, (err) => {
    updateStatus(undefined, false);
    onData(DEFAULT_CONFIG);
  });
};

export const saveSchoolConfig = async (config: SchoolConfig): Promise<void> => {
  try {
    await setDoc(doc(db, COLLECTIONS.CONFIG, "main_settings"), config);
  } catch (e: any) {
    if (e.message.includes("permission")) {
      throw new Error("Izin ditolak. Silakan klik 'Publish' pada Firestore Rules di Firebase Console Anda.");
    }
    throw e;
  }
};

export const subscribeToTemplates = (onData: (templates: LetterTemplate[]) => void) => {
  const q = query(collection(db, "letter_templates"), orderBy("createdAt", "asc"));
  return onSnapshot(q, (snapshot) => {
    let templates = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LetterTemplate));
    if (templates.length === 0) {
      const defaults = LETTER_TEMPLATES.map(t => ({...t, createdAt: new Date().toISOString()})) as LetterTemplate[];
      onData(defaults);
    } else {
      onData(templates);
    }
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

forceCheckConnections();

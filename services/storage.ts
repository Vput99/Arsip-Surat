
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
  if (turso !== undefined) isTursoConnected = turso;
  if (firebase !== undefined) isFirebaseConnected = firebase;
  connectionListeners.forEach(cb => cb({ turso: isTursoConnected, firebase: isFirebaseConnected }));
};

// Fungsi untuk memaksa cek koneksi (Ping)
export const forceCheckConnections = async () => {
  // 1. Cek Turso
  if (turso) {
    try {
      console.log("Pinging Turso...");
      // Coba query ringan
      await turso.execute("SELECT 1");
      // Jika berhasil, pastikan tabel ada
      await initTables();
      console.log("Ping Turso Success");
      updateStatus(true, undefined);
      fetchMails(); // Refresh data
    } catch (e) {
      console.error("Turso Check Failed:", e);
      updateStatus(false, undefined);
    }
  } else {
    updateStatus(false, undefined);
  }

  // 2. Cek Firebase
  try {
    const docRef = doc(db, COLLECTIONS.CONFIG, "main_settings");
    await getDoc(docRef); // Ping read
    updateStatus(undefined, true);
  } catch (e) {
    console.error("Firebase Check Failed:", e);
    updateStatus(undefined, false);
  }
  
  return { turso: isTursoConnected, firebase: isFirebaseConnected };
};

export const subscribeToConnectionStatus = (callback: (status: { turso: boolean, firebase: boolean }) => void) => {
  connectionListeners.push(callback);
  callback({ turso: isTursoConnected, firebase: isFirebaseConnected });
  
  // Jika belum terkoneksi, coba konek otomatis saat ada yang subscribe
  if (!isTursoConnected || !isFirebaseConnected) {
    forceCheckConnections();
  }

  return () => {
    const index = connectionListeners.indexOf(callback);
    if (index > -1) connectionListeners.splice(index, 1);
  };
};

// --- TURSO: MAILS (SQL ARCHIVE) ---
let mailListeners: ((mails: Mail[]) => void)[] = [];

const fetchMails = async () => {
  if (!turso) {
    return;
  }
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
  // Polling setiap 10 detik untuk update data SQL
  const interval = setInterval(fetchMails, 10000); 
  return () => { 
    clearInterval(interval); 
    mailListeners = mailListeners.filter(l => l !== onData); 
  };
};

export const saveMail = async (mail: Mail): Promise<void> => {
  if (turso) {
    try {
      await turso.execute({
        sql: `INSERT OR REPLACE INTO mails (id, type, referenceNumber, date, receivedDate, createdAt, sender, subject, description, fileUrl, category, urgency, status, aiSummary) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [mail.id, mail.type, mail.referenceNumber, mail.date, mail.receivedDate, mail.createdAt, mail.sender, mail.subject, mail.description, mail.fileUrl || null, mail.category, mail.urgency, mail.status, mail.aiSummary || null]
      });
      fetchMails();
    } catch (e) {
      console.error("Turso Save Error:", e);
      throw new Error("Gagal menyimpan ke database arsip.");
    }
  } else {
    throw new Error("Koneksi database arsip (Turso) tidak tersedia.");
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
    onData([]); 
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
      saveSchoolConfig(DEFAULT_CONFIG).catch(e => console.warn("Auto-save config failed:", e));
    }
    updateStatus(undefined, true);
  }, (err) => {
    console.error("Firebase Config Error:", err);
    onData(DEFAULT_CONFIG);
    updateStatus(undefined, false);
  });
};

export const saveSchoolConfig = async (config: SchoolConfig): Promise<void> => {
  await setDoc(doc(db, COLLECTIONS.CONFIG, "main_settings"), config);
};

// Sinkronisasi Template secara Real-time
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
  }, (err) => {
    console.error("Firebase Templates Error:", err);
    const defaults = LETTER_TEMPLATES.map(t => ({...t, createdAt: new Date().toISOString()})) as LetterTemplate[];
    onData(defaults);
  });
};

export const saveTemplate = async (t: LetterTemplate): Promise<void> => {
  await setDoc(doc(db, "letter_templates", t.id), { ...t });
};

export const deleteTemplate = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, "letter_templates", id));
};

// Initial check on load
forceCheckConnections();

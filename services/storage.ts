
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
  limit,
  getDocs
} from "firebase/firestore";
import { Mail, SchoolConfig, MonthlyReport, ActivityLog } from '../types';
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
  address: 'Jl. Raya Tempurejo No.12',
  email: 'tempurejo01@gmail.com',
  npsn: '20534296',
  nss: '101056303033',
  phone: '085815037565',
  village: 'TEMPUREJO',
  district: 'PESANTREN',
  city: 'KEDIRI',
  province: 'JAWA TIMUR',
  accreditation: 'A',
  accreditationYear: '2015',
  gugus: 'INTVIMBA 5',
  headerLine1: 'PEMERINTAH KOTA KEDIRI',
  headerLine2: 'DINAS PENDIDIKAN',
  logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/9/9c/Logo_Tut_Wuri_Handayani.svg',
  logoDaerahUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Logo_Kota_Kediri.png/900px-Logo_Kota_Kediri.png',
  principalName: 'Nita Ekaningkarti Adji, S.Pd',
  principalNip: '19860213 201409 2 002'
};

// --- ACTIVITY LOGGING ---
export const logActivity = async (log: Omit<ActivityLog, 'id' | 'timestamp'>) => {
  const newLog: ActivityLog = {
    ...log,
    id: `log_${Date.now()}`,
    timestamp: new Date().toISOString()
  };
  await setDoc(doc(db, "activity_logs", newLog.id), newLog);
};

export const subscribeToLogs = (onData: (logs: ActivityLog[]) => void) => {
  const q = query(collection(db, "activity_logs"), orderBy("timestamp", "desc"), limit(20));
  return onSnapshot(q, (snap) => {
    onData(snap.docs.map(d => d.data() as ActivityLog));
  });
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
    const docRef = doc(db, COLLECTIONS.CONFIG, "main_settings");
    await getDoc(docRef);
    updateStatus(undefined, true);
    return { turso: isTursoConnected, firebase: true };
  } catch (e) {
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

export const initializeDefaultData = async () => {
  try {
    const configSnap = await getDoc(doc(db, COLLECTIONS.CONFIG, "main_settings"));
    if (!configSnap.exists()) {
      await setDoc(doc(db, COLLECTIONS.CONFIG, "main_settings"), DEFAULT_CONFIG);
    }
    for (const t of LETTER_TEMPLATES) {
      const templateData: LetterTemplate = {
        ...t,
        createdAt: new Date().toISOString()
      };
      await setDoc(doc(db, "letter_templates", t.id), templateData);
    }
    await logActivity({ action: 'Inisialisasi', module: 'Sistem', details: 'Database dikalibrasi ulang ke pengaturan standar.' });
    return true;
  } catch (e) {
    console.error("Initialization failed:", e);
    throw e;
  }
};

// --- BACKUP LOGIC ---
export const exportFullBackup = async () => {
  // Ambil semua data Firebase utama
  const staffSnap = await getDocs(collection(db, "staff"));
  const configSnap = await getDoc(doc(db, COLLECTIONS.CONFIG, "main_settings"));
  const templatesSnap = await getDocs(collection(db, "letter_templates"));
  
  // Ambil data SQL (Mails)
  let mails: Mail[] = [];
  if (turso) {
    const rs = await turso.execute("SELECT * FROM mails");
    mails = rs.rows.map(row => ({ ...row } as unknown as Mail));
  }

  const backupData = {
    schoolConfig: configSnap.data(),
    staff: staffSnap.docs.map(d => d.data()),
    templates: templatesSnap.docs.map(d => d.data()),
    mails: mails,
    exportDate: new Date().toISOString(),
    version: '2.0-WORK'
  };

  const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `BACKUP_SD_PINTAR_${new Date().toISOString().split('T')[0]}.json`;
  link.click();
  URL.revokeObjectURL(url);
  
  await logActivity({ action: 'Backup', module: 'Sistem', details: 'Admin melakukan pencadangan data ke file lokal.' });
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
  try {
    await turso.execute("ALTER TABLE mails ADD COLUMN disposition TEXT");
  } catch (e) {}
  await turso.execute({
    sql: `INSERT OR REPLACE INTO mails (id, type, referenceNumber, date, receivedDate, createdAt, sender, subject, description, fileUrl, category, urgency, status, aiSummary, disposition) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      mail.id, mail.type, mail.referenceNumber, mail.date, mail.receivedDate, mail.createdAt, 
      mail.sender, mail.subject, mail.description, mail.fileUrl || null, mail.category, 
      mail.urgency, mail.status, mail.aiSummary || null, mail.disposition || null
    ]
  });
  await logActivity({ action: 'Simpan', module: `Arsip ${mail.type}`, details: `Surat: ${mail.subject} (${mail.referenceNumber})` });
  fetchMails();
};

export const deleteMail = async (id: string): Promise<void> => {
  if (turso) {
    await turso.execute({ sql: "DELETE FROM mails WHERE id = ?", args: [id] });
    await logActivity({ action: 'Hapus', module: 'Arsip', details: `Menghapus arsip ID: ${id}` });
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
  await logActivity({ action: 'Update', module: 'Personil', details: `Data pegawai: ${member.name} diperbarui.` });
};

export const deleteStaff = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, "staff", id));
  await logActivity({ action: 'Hapus', module: 'Personil', details: `Menghapus personil ID: ${id}` });
};

// --- MONTHLY REPORTS ---
export const saveMonthlyReport = async (report: MonthlyReport) => {
  const docId = `rep_${report.year}_${report.month}`;
  await setDoc(doc(db, "monthly_reports", docId), report);
  await logActivity({ action: 'Simpan', module: 'Lapor Bulan', details: `Laporan F-SEK bulan ke-${report.month + 1} tahun ${report.year} disimpan.` });
};

export const subscribeToMonthlyReport = (year: number, month: number, onData: (data: MonthlyReport | null) => void) => {
  const docId = `rep_${year}_${month}`;
  return onSnapshot(doc(db, "monthly_reports", docId), (snap) => {
    if (snap.exists()) onData(snap.data() as MonthlyReport);
    else onData(null);
  });
};

// --- ATTENDANCE REALTIME ---
export const subscribeToAttendance = (year: number, month: number, category: string, onData: (data: any) => void) => {
  const docId = `att_${year}_${month}_${category}`;
  const docRef = doc(db, "attendance", docId);
  return onSnapshot(docRef, (snapshot) => {
    if (snapshot.exists()) {
      onData(snapshot.data());
    } else {
      onData({ attendance: {}, holidays: [] });
    }
    updateStatus(undefined, true);
  }, (err) => {
    updateStatus(undefined, false);
  });
};

export const saveAttendance = async (year: number, month: number, category: string, data: any) => {
  const docId = `att_${year}_${month}_${category}`;
  await setDoc(doc(db, "attendance", docId), { 
    ...data, 
    updatedAt: new Date().toISOString() 
  }, { merge: true });
  // Debounce log agar tidak spam setiap klik cell
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
  await setDoc(doc(db, COLLECTIONS.CONFIG, "main_settings"), config);
  await logActivity({ action: 'Update', module: 'Profil', details: 'Identitas utama sekolah diperbarui.' });
};

export const subscribeToTemplates = (onData: (templates: LetterTemplate[]) => void) => {
  const q = query(collection(db, "letter_templates"), orderBy("createdAt", "asc"));
  return onSnapshot(q, (snapshot) => {
    let templates = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LetterTemplate));
    onData(templates);
    updateStatus(undefined, true);
  }, (err) => {
    updateStatus(undefined, false);
  });
};

export const saveTemplate = async (t: LetterTemplate): Promise<void> => {
  await setDoc(doc(db, "letter_templates", t.id), { ...t });
  await logActivity({ action: 'Update', module: 'Templat', details: `Naskah templat: ${t.name} diubah.` });
};

export const deleteTemplate = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, "letter_templates", id));
  await logActivity({ action: 'Hapus', module: 'Templat', details: `Menghapus templat ID: ${id}` });
};

forceCheckConnections();

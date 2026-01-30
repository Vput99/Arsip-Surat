import { db, COLLECTIONS } from './firebase';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  orderBy, 
  setDoc,
  getDocs
} from "firebase/firestore";
import { Mail, SchoolConfig } from '../types';
import { MOCK_INITIAL_DATA } from '../constants';

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

// Store active listeners to update them manually when offline actions happen
let mailListeners: ((mails: Mail[]) => void)[] = [];
let configListeners: ((config: SchoolConfig) => void)[] = [];

// --- REALTIME LISTENERS ---

// Subscribe to Mails
export const subscribeToMails = (onData: (mails: Mail[]) => void) => {
  mailListeners.push(onData);
  
  // 1. Load data from local storage immediately (Fast render)
  onData(getLocalMails());

  // 2. Try connecting to Firebase
  const q = query(collection(db, COLLECTIONS.MAILS), orderBy("createdAt", "desc"));
  
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const mails: Mail[] = [];
    snapshot.forEach((doc) => {
      mails.push({ id: doc.id, ...doc.data() } as Mail);
    });
    
    // Sync to local storage for backup
    localStorage.setItem('OFFLINE_MAILS', JSON.stringify(mails));
    onData(mails);
  }, (error) => {
    console.error("Firestore Error (Switching to Offline Mode):", error.message);
    // If Firebase fails, we rely on the local data already loaded.
    // We don't need to do anything else, as local data is already active.
  });

  return () => {
    unsubscribe();
    mailListeners = mailListeners.filter(l => l !== onData);
  };
};

// Subscribe to Config
export const subscribeToConfig = (onData: (config: SchoolConfig) => void) => {
  configListeners.push(onData);
  
  // 1. Load local config immediately
  onData(getLocalConfig());

  // 2. Try Firebase
  const docRef = doc(db, COLLECTIONS.CONFIG, 'main_settings');
  
  const unsubscribe = onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      const config = docSnap.data() as SchoolConfig;
      localStorage.setItem('OFFLINE_CONFIG', JSON.stringify(config));
      onData(config);
    } else {
      // Init config if not exists
      saveSchoolConfig(DEFAULT_CONFIG);
    }
  }, (error) => {
    console.error("Firestore Config Error (Offline Mode):", error.message);
  });

  return () => {
    unsubscribe();
    configListeners = configListeners.filter(l => l !== onData);
  };
};

// --- ACTIONS ---

export const saveMail = async (mail: Mail): Promise<void> => {
  // 1. Optimistic Update (Update Local First)
  const currentMails = getLocalMails();
  // Ensure ID exists. If creating, use timestamp. If updating, use existing.
  const mailId = mail.id || Date.now().toString();
  const mailToSave = { ...mail, id: mailId };

  const existingIdx = currentMails.findIndex(m => m.id === mailId);
  let newMails;
  
  if (existingIdx >= 0) {
    newMails = [...currentMails];
    newMails[existingIdx] = mailToSave;
  } else {
    newMails = [mailToSave, ...currentMails];
  }

  // Save to LocalStorage
  localStorage.setItem('OFFLINE_MAILS', JSON.stringify(newMails));
  // Notify listeners manually (updates UI immediately without waiting for network)
  mailListeners.forEach(l => l(newMails));

  // 2. Try Saving to Firebase (Background)
  try {
    const dataToSave = JSON.parse(JSON.stringify(mailToSave));
    delete dataToSave.id; // Don't save ID inside doc

    // Logic: If ID is long string -> Firestore ID. If numbers -> Timestamp ID (Local)
    // If it's a Timestamp ID, we should technically addDoc to get a real ID, 
    // but for hybrid offline sync simply, we might treat it as a custom ID document.
    
    if (existingIdx >= 0 && mail.id && !(/^\d+$/.test(mail.id))) {
       // Update existing Firestore doc
       await updateDoc(doc(db, COLLECTIONS.MAILS, mail.id), dataToSave);
    } else {
       // New doc or local-only doc being synced
       if (mail.id && /^\d+$/.test(mail.id)) {
           // It's a timestamp ID, let's use setDoc to force this ID so it matches local
           // OR use addDoc and accept divergence. Using setDoc with custom ID is safer for sync.
           // However, Firestore IDs are usually strings. Using timestamp string is fine.
           await setDoc(doc(db, COLLECTIONS.MAILS, mailId), dataToSave);
       } else {
           await addDoc(collection(db, COLLECTIONS.MAILS), dataToSave);
       }
    }
  } catch (error) {
    console.warn("Save to Cloud failed (Offline Mode active):", error);
    // Silent fail is okay because we already updated local state
  }
};

export const deleteMail = async (id: string): Promise<void> => {
  // 1. Optimistic Delete (Local)
  const currentMails = getLocalMails();
  const newMails = currentMails.filter(m => m.id !== id);
  localStorage.setItem('OFFLINE_MAILS', JSON.stringify(newMails));
  mailListeners.forEach(l => l(newMails));

  // 2. Try Firebase
  try {
    await deleteDoc(doc(db, COLLECTIONS.MAILS, id));
  } catch (error) {
    console.warn("Delete from Cloud failed (Offline Mode active):", error);
  }
};

export const saveSchoolConfig = async (config: SchoolConfig): Promise<void> => {
  // 1. Local
  localStorage.setItem('OFFLINE_CONFIG', JSON.stringify(config));
  configListeners.forEach(l => l(config));

  // 2. Firebase
  try {
    await setDoc(doc(db, COLLECTIONS.CONFIG, 'main_settings'), config);
  } catch (error) {
    console.warn("Save Config to Cloud failed:", error);
  }
};

// --- BACKUP & RESTORE ---

export const exportDatabase = async (): Promise<string> => {
  try {
    // Try to get latest from Cloud, fallback to Local
    let mails: any[] = [];
    let configs: any[] = [];

    try {
        const mailsSnapshot = await getDocs(collection(db, COLLECTIONS.MAILS));
        mails = mailsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const configSnapshot = await getDocs(collection(db, COLLECTIONS.CONFIG));
        configs = configSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
        console.warn("Exporting from Offline Storage");
        mails = getLocalMails();
        configs = [getLocalConfig()];
    }

    const backup = {
      version: 1,
      timestamp: new Date().toISOString(),
      mails,
      configs
    };

    return JSON.stringify(backup, null, 2);
  } catch (error) {
    console.error("Export failed:", error);
    throw new Error("Gagal mengekspor database.");
  }
};

export const importDatabase = async (jsonString: string): Promise<boolean> => {
  try {
    const data = JSON.parse(jsonString);

    if (data.mails && Array.isArray(data.mails)) {
      // Update Local
      localStorage.setItem('OFFLINE_MAILS', JSON.stringify(data.mails));
      mailListeners.forEach(l => l(data.mails));

      // Try Push to Cloud (Best effort)
      for (const mail of data.mails) {
        const { id, ...rest } = mail;
        try {
            if (id) await setDoc(doc(db, COLLECTIONS.MAILS, id), rest);
            else await addDoc(collection(db, COLLECTIONS.MAILS), rest);
        } catch (e) { /* ignore cloud errors */ }
      }
    }

    if (data.configs && Array.isArray(data.configs)) {
      const config = data.configs[0];
      if (config) {
         localStorage.setItem('OFFLINE_CONFIG', JSON.stringify(config));
         configListeners.forEach(l => l(config));
         try {
             const { id, ...rest } = config;
             await setDoc(doc(db, COLLECTIONS.CONFIG, 'main_settings'), rest);
         } catch(e) { /* ignore */ }
      }
    }

    return true;
  } catch (error) {
    console.error("Import failed:", error);
    return false;
  }
};
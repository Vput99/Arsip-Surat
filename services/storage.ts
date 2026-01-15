import { Mail } from '../types';
import { MOCK_INITIAL_DATA } from '../constants';

const STORAGE_KEY = 'arsip_surat_db_v1';

// Initialize DB if empty
const initDB = () => {
  if (typeof window === 'undefined') return;
  const existing = localStorage.getItem(STORAGE_KEY);
  if (!existing) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(MOCK_INITIAL_DATA));
  }
};

initDB();

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
  // Dispatch event for "realtime" feeling across components
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

import React;

export enum MailType {
  INCOMING = 'Masuk',
  OUTGOING = 'Keluar'
}

export enum MailStatus {
  PENDING = 'Menunggu',
  PROCESSED = 'Diproses',
  ARCHIVED = 'Diarsipkan',
  REJECTED = 'Ditolak'
}

export enum UrgencyLevel {
  LOW = 'Biasa',
  MEDIUM = 'Penting',
  HIGH = 'Segera'
}

export interface Mail {
  id: string;
  type: MailType;
  referenceNumber: string;
  date: string;
  receivedDate: string;
  createdAt: string;
  sender: string;
  subject: string;
  description: string;
  fileUrl?: string;
  category: string;
  urgency: UrgencyLevel;
  status: MailStatus;
  aiSummary?: string;
  disposition?: string;
}

export interface AIAnalysisResult {
  summary: string;
  category: string;
  urgency: string;
  sentiment?: string;
  referenceNumber: string;
  sender: string;
  subject: string;
  date: string;
}

export interface StudentRow {
  l: number[]; // Index 0-5 for Class 1-6
  p: number[]; // Index 0-5 for Class 1-6
}

export interface MonthlyReport {
  id: string;
  month: number;
  year: number;
  // Section A: Keadaan Siswa
  studentMatrix: {
    wniAsli: StudentRow;
    wniTionghoa: StudentRow;
    wniArab: StudentRow;
    wniLain: StudentRow;
    agamaIslam: StudentRow;
    agamaKatolik: StudentRow;
    agamaProtestan: StudentRow;
    agamaHindu: StudentRow;
    agamaBudha: StudentRow;
  };
  // Section B & C
  classCondition: { baik: number, rusakRingan: number, rusakBerat: number };
  studentAge: { under7: number, age7_12: number, over12: number };
  // Section D: Kepegawaian
  staffData: Record<string, { pnsL: number, pnsP: number, nonPnsL: number, nonPnsP: number }>;
  // Section E & F
  effectiveDays: number;
  absentSakit: number;
  absentIjin: number;
  absentAlfa: number;
  graduates: { l: number, p: number };
  // Section G: Sarpras
  facilities: { name: string, count: number }[];
  
  infrastructureNote: string;
  summaryNarrative: string;
  createdAt: string;
}

export interface SchoolConfig {
  name: string;
  address: string;
  email: string;
  npsn: string;
  nss: string;
  phone: string;
  village: string;
  district: string;
  city: string;
  province: string;
  accreditation: string;
  accreditationYear: string;
  gugus: string;
  headerLine1: string;
  headerLine2: string;
  logoUrl: string;
  logoDaerahUrl: string;
  principalName: string;
  principalNip: string;
}

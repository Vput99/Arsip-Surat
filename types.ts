
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

export interface ActivityLog {
  id: string;
  timestamp: string;
  action: string;
  module: string;
  details: string;
  icon?: string;
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
  
  // BAGIAN UTAMA: Identitas & Agama (Halaman Depan)
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
    agamaLain: StudentRow;
  };

  // BAGIAN KEPEGAWAIAN (Halaman Depan - Agregat)
  staffData: Record<string, { 
    pnsL: number, pnsP: number, 
    nonPnsL: number, nonPnsP: number,
    s1L: number, s1P: number,
    d3L: number, d3P: number
  }>;

  // BAGIAN DATA PTK (Halaman Belakang Detail - Per Orang)
  staffDetailedData?: Record<string, {
    absent: { s: number, i: number, a: number, ch: number, cd: number, dl: number },
    birthInfo?: string,
    tmtCpns?: string,
    tmtGol?: string,
    masaKerja?: string,
    jabatan?: string,
    status?: string,
    unitKerja?: string,
    pendidikan?: string,
    phone?: string,
    rank?: string,
    note: string
  }>;

  // BAGIAN A: Kondisi Ruang (Halaman Belakang)
  roomCondition: {
    baik: number[];
    rusakRingan: number[];
    rusakBerat: number[];
  };

  // BAGIAN B: Rombel & Miskin (Halaman Belakang)
  rombelData: {
    jumlah: number[];
    miskin: number[];
  };

  // BAGIAN C: Usia Siswa (Halaman Belakang)
  ageData: {
    under7: number[];
    age7_12: number[];
    over12: number[];
  };

  // BAGIAN D: Absensi
  effectiveDays: number;
  absentData: { sakit: number, ijin: number, alfa: number };

  // BAGIAN E: Kelulusan
  graduationData: {
    pesertaL: number, pesertaP: number,
    lulusL: number, lulusP: number
  };

  // BAGIAN F: Sarana Pendidikan (Halaman Belakang)
  facilities: { name: string, count: number }[];

  // BAGIAN MUTASI (Halaman Belakang)
  mutasi: {
    awalL: number[]; awalP: number[];
    masukL: number[]; masukP: number[];
    keluarL: number[]; keluarP: number[];
  };

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

import React from 'react';

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
  referenceNumber: string; // Nomor Surat
  date: string; // Tanggal Surat
  receivedDate: string; // Tanggal Diterima/Dikirim
  createdAt: string; // Waktu Input Data (Realtime)
  sender: string; // Pengirim (untuk surat masuk) or Tujuan (untuk surat keluar)
  subject: string; // Perihal
  description: string; // Isi Ringkas
  fileUrl?: string; // Simulasi link file
  category: string;
  urgency: UrgencyLevel;
  status: MailStatus;
  aiSummary?: string; // Ringkasan dari AI
}

export interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
}

export interface AIAnalysisResult {
  summary: string;
  category: string;
  urgency: UrgencyLevel;
  sentiment: string;
  referenceNumber?: string;
  sender?: string;
  subject?: string;
}

export interface SchoolConfig {
  name: string;
  address: string;
  email: string;
  npsn: string;
  headerLine1: string; // e.g. PEMERINTAH KOTA KEDIRI
  headerLine2: string; // e.g. DINAS PENDIDIKAN
  logoUrl: string; // Logo Sekolah (Kanan)
  logoDaerahUrl: string; // Logo Daerah (Kiri)
  principalName: string; // Nama Kepala Sekolah Default
  principalNip: string; // NIP Kepala Sekolah Default
}
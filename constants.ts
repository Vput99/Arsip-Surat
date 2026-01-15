import { MailType, MailStatus, UrgencyLevel } from './types';

export const APP_NAME = "ArsipSurat SD";

export const CATEGORIES = [
  "Undangan",
  "Dinas",
  "Pemberitahuan",
  "Permohonan",
  "Keputusan",
  "Tugas",
  "Lainnya"
];

export const MOCK_INITIAL_DATA = [
  {
    id: '1',
    type: MailType.INCOMING,
    referenceNumber: '005/DISDIK/2024',
    date: '2024-05-20',
    receivedDate: '2024-05-21',
    sender: 'Dinas Pendidikan Kota',
    subject: 'Undangan Rapat Koordinasi Kepala Sekolah',
    description: 'Undangan untuk menghadiri rapat koordinasi mengenai kurikulum baru di Aula Dinas.',
    category: 'Undangan',
    urgency: UrgencyLevel.HIGH,
    status: MailStatus.PROCESSED,
    aiSummary: 'Rapat wajib Kepsek mengenai kurikulum baru pada tanggal 25 Mei.'
  },
  {
    id: '2',
    type: MailType.OUTGOING,
    referenceNumber: '421.2/010/SD-01/2024',
    date: '2024-05-22',
    receivedDate: '2024-05-22',
    sender: 'SD Negeri 01 Pagi', // Recipient in context of outgoing
    subject: 'Balasan Permohonan Izin Kunjungan Museum',
    description: 'Surat balasan menyetujui jadwal kunjungan siswa kelas 5 ke Museum Sejarah.',
    category: 'Dinas',
    urgency: UrgencyLevel.MEDIUM,
    status: MailStatus.ARCHIVED,
    aiSummary: 'Konfirmasi kunjungan museum untuk kelas 5 disetujui.'
  }
];
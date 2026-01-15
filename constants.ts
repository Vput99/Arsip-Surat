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

export const LETTER_TEMPLATES = [
  {
    id: 't_mutasi_masuk',
    name: 'Surat Keterangan Menerima Siswa Pindahan',
    subject: 'SURAT KETERANGAN MENERIMA SISWA PINDAHAN',
    category: 'Dinas',
    layout: 'centered',
    content: `Yang bertanda tangan di bawah ini :

Nama           : ........................................................................
NIP            : ........................................................................
Jabatan        : Kepala Sekolah
Unit Kerja     : ........................................................................
Alamat         : ........................................................................

Menerangkan Bahwa :

Nama              : ........................................................................
Tempat/Tgl Lahir  : ........................................................................
Kelas             : ........................................................................
Nama Sekolah Asal : ........................................................................
Alamat            : ........................................................................

Bahwa yang bersangkutan DITERIMA sebagai siswa di Sekolah Dasar Negeri ......................................

Demikian Surat Keterangan ini, agar dapat dipergunakan mestinya.`
  },
  {
    id: 't_mutasi_keluar',
    name: 'Surat Keterangan Pindah Sekolah (Mutasi Keluar)',
    subject: 'SURAT KETERANGAN PINDAH SEKOLAH',
    category: 'Dinas',
    layout: 'centered',
    content: `Yang bertanda tangan di bawah ini Kepala Sekolah Dasar Negeri [NAMA_SEKOLAH], menerangkan bahwa :

Nama : ...........................................................
Tempat/Tgl Lahir : ...........................................................
Jenis Kelamin : ...........................................................
NISN : ...........................................................
Murid Tingkat / Kelas : ...........................................................

Sesuai Surat permohonan pindah sekolah oleh orang tua / wali murid :

Nama : ...........................................................
Pekerjaan : ...........................................................

Telah mengajukan pindah ke salah satu Sekolah ...........................................................
Kecamatan ........................... Kabupaten ...........................
Provinsi ........................... dengan alasan ...........................................................

Demikian Surat Keterangan Pindah Sekolah ini dibuat untuk dapat dipergunakan sebagaimana mestinya.

-------------------------------------------------- ✂ --------------------------------------------------

Setelah anak diterima di sekolah ini, isian di bawah ini harap dikirim kembali pada kami.

NSS : [ ][ ][ ][ ][ ][ ][ ][ ][ ][ ][ ][ ]

Nama Sekolah : ...........................................................
Status Sekolah : ...........................................................
Alamat : ...........................................................
Nama Siswa : ...........................................................
Diterima di kelas : ...........................................................
Diterima tanggal : ...........................................................

......................, ...........................
Kepala Sekolah Penerima,


( ........................................ )
NIP. ........................................`
  },
  {
    id: 't_spt',
    name: 'Surat Perintah Tugas (SPT)',
    subject: 'SURAT PERINTAH TUGAS',
    category: 'Tugas',
    layout: 'centered',
    content: `PERJALANAN DINAS DALAM DAERAH

Dasar : 1. Surat Undangan Dinas Pendidikan Nomor ........................
           tentang ........................

MENUGASKAN :

Kepada : 1. Nama        : ........................
            NIP         : ........................
            Pangkat/Gol : ........................
            Jabatan     : ........................

         2. dst

Untuk  : ........................
Pada tanggal  : ........................
Tempat tujuan : ........................

Pembebanan Biaya :
a. Kode Rekening Kegiatan/Sub Kegiatan : ........................
b. Nama Kegiatan/Sub Kegiatan          : ........................`
  },
  {
    id: 't_laporan',
    name: 'Laporan Perjalanan Dinas',
    subject: 'LAPORAN PERJALANAN DINAS',
    category: 'Dinas',
    layout: 'centered',
    signatureTitle: 'Pelaksana Perjalanan Dinas',
    content: `I.   DASAR
     ............................................................................................

II.  MAKSUD & TUJUAN
     ............................................................................................

III. WAKTU PELAKSANAAN
     Hari    : ........................
     Tanggal : ........................

IV.  PELAKSANA PERJALANAN DINAS
     ............................................................................................

V.   DAERAH TUJUAN/INSTANSI
     ............................................................................................

VI.  HADIR DALAM PERTEMUAN
     ............................................................................................

VII. PETUNJUK/ARAHAN
     ............................................................................................

VIII. MASALAH/TEMUAN
     ............................................................................................

IX.  SARAN TINDAKAN
     ............................................................................................

X.   LAIN-LAIN
     ............................................................................................`
  },
  {
    id: 't1',
    name: 'Surat Undangan Wali Murid',
    subject: 'Undangan Pengambilan Rapor',
    category: 'Undangan',
    layout: 'standard',
    content: `Dengan hormat,

Sehubungan dengan berakhirnya kegiatan pembelajaran Semester Genap Tahun Ajaran 2023/2024, kami mengundang Bapak/Ibu Wali Murid untuk hadir pada:

Hari/Tanggal : [HARI], [TANGGAL]
Pukul        : 08.00 WIB - Selesai
Tempat       : Ruang Kelas [KELAS]
Acara        : Pengambilan Rapor Semester Genap

Mengingat pentingnya acara ini, kami mengharapkan kehadiran Bapak/Ibu tepat pada waktunya.

Demikian undangan ini kami sampaikan. Atas perhatian dan kehadirannya, kami ucapkan terima kasih.`
  },
  {
    id: 't3',
    name: 'Surat Keterangan Siswa',
    subject: 'Surat Keterangan Aktif Sekolah',
    category: 'Dinas',
    layout: 'standard',
    content: `Yang bertanda tangan di bawah ini Kepala Sekolah Dasar Negeri [NAMA_SEKOLAH], menerangkan bahwa:

Nama    : [NAMA_SISWA]
NISN    : [NISN]
Kelas   : [KELAS]

Adalah benar-benar siswa aktif di sekolah kami pada Tahun Ajaran 2023/2024. Surat keterangan ini dibuat untuk keperluan [KEPERLUAN].

Demikian surat keterangan ini dibuat agar dapat dipergunakan sebagaimana mestinya.`
  }
];

export const MOCK_INITIAL_DATA = [
  {
    id: '1',
    type: MailType.INCOMING,
    referenceNumber: '005/DISDIK/2024',
    date: '2024-05-20',
    receivedDate: '2024-05-21',
    createdAt: '2024-05-21T08:30:00.000Z',
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
    createdAt: '2024-05-22T10:15:00.000Z',
    sender: 'SD Negeri 01 Pagi', // Recipient in context of outgoing
    subject: 'Balasan Permohonan Izin Kunjungan Museum',
    description: 'Surat balasan menyetujui jadwal kunjungan siswa kelas 5 ke Museum Sejarah.',
    category: 'Dinas',
    urgency: UrgencyLevel.MEDIUM,
    status: MailStatus.ARCHIVED,
    aiSummary: 'Konfirmasi kunjungan museum untuk kelas 5 disetujui.'
  }
];
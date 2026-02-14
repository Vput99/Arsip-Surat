
import { MailType, MailStatus, UrgencyLevel } from './types';

export const APP_NAME = "ArsipSurat SD";

export const CATEGORIES = [
  "Undangan",
  "Dinas",
  "Pemberitahuan",
  "Permohonan",
  "Keputusan",
  "Tugas",
  "Kerjasama",
  "Mutasi",
  "Lainnya"
];

export const LETTER_TEMPLATES = [
  {
    id: 't_spt',
    name: 'Surat Perintah Tugas (SPT)',
    subject: 'SURAT PERINTAH TUGAS',
    category: 'Tugas',
    layout: 'centered',
    content: `Dasar : 1. Program Kerja Sekolah Tahun Pelajaran 2024/2025.
Dasar : 2. Kalender Pendidikan Tahun Pelajaran 2024/2025.

MEMERINTAHKAN :

Kepada :
Nama : [NAMA_PETUGAS]
NIP : [NIP_PETUGAS]
Jabatan : [JABATAN_PETUGAS]

Nama tersebut akan di beri tugas untuk menghadiri undangan tersebut pada :
tanggal : [TANGGAL]
Tempat : [TEMPAT]

Berikut surat tugas ini dibuat untuk dilaksanakan dengan penuh tanggung jawab.`
  },
  {
    id: 't_sppd',
    name: 'Surat Perintah Perjalanan Dinas (SPPD)',
    subject: 'SURAT PERINTAH PERJALANAN DINAS',
    category: 'Dinas',
    layout: 'centered',
    content: `Pejabat Pemberi Perintah : Kepala Sekolah
Nama Pegawai yang diperintah : [NAMA_PETUGAS]
NIP : [NIP_PETUGAS]
Pangkat dan Golongan : [JABATAN_PETUGAS]
Jabatan : Guru / Pegawai
Maksud Perjalanan Dinas : Menghadiri ...
Alat Angkut yang dipergunakan : Kendaraan Pribadi / Dinas
Tempat Berangkat : SDN [NAMA_SEKOLAH]
Tempat Tujuan : ...
Lamanya Perjalanan Dinas : 1 (Satu) Hari
Tanggal Berangkat : ...
Tanggal Kembali : ...
Dasar Perintah : SPT Nomor ... Tanggal ...
Instansi / Akun : Dana BOS / Sekolah
Keterangan Lain-lain : -`
  },
  {
    id: 't_undangan_rapat',
    name: 'Undangan Rapat Dinas/Komite',
    subject: 'UNDANGAN RAPAT KOORDINASI SEKOLAH',
    category: 'Undangan',
    layout: 'standard',
    content: `Kepada Yth.
Bapak/Ibu Dewan Guru dan Staf Karyawan
SDN [NAMA_SEKOLAH]
di Tempat

Dengan hormat,

Mengharap kehadiran Bapak/Ibu dalam acara Rapat Koordinasi yang akan dilaksanakan pada:

Hari / Tanggal : ...................................................
Waktu : ...................................................
Tempat : Ruang Pertemuan / Guru
Acara : ...................................................

Demikian undangan ini kami sampaikan, mengingat pentingnya acara tersebut kami mohon kehadiran Bapak/Ibu tepat pada waktunya. Atas perhatiannya kami ucapkan terima kasih.`
  },
  {
    id: 't_suket_siswa',
    name: 'Surat Keterangan Berkelakuan Baik',
    subject: 'SURAT KETERANGAN BERKELAKUAN BAIK',
    category: 'Dinas',
    layout: 'centered',
    content: `Yang bertanda tangan di bawah ini Kepala Sekolah Dasar Negeri [NAMA_SEKOLAH] menerangkan bahwa :

Nama : ...................................................
Tempat / Tgl Lahir : ...................................................
Nomor Induk Siswa : ...................................................
NISN : ...................................................
Jenis Kelamin : ...................................................
Pekerjaan : Siswa / Pelajar

Berdasarkan data sekolah, nama tersebut di atas benar-benar siswa kami yang memiliki catatan kelakuan baik selama mengikuti kegiatan belajar mengajar di sekolah.

Surat keterangan ini diberikan kepada yang bersangkutan untuk dipergunakan sebagai syarat : ...................................................

Demikian surat keterangan ini dibuat dengan sebenarnya agar dapat dipergunakan sebagaimana mestinya.`
  },
  {
    id: 't_surat_pengantar',
    name: 'Surat Pengantar Dokumen',
    subject: 'SURAT PENGANTAR',
    category: 'Dinas',
    layout: 'centered',
    content: `Kepada Yth.
Kepala Dinas Pendidikan Kota Kediri
U.p. Bidang Pembinaan Pendidikan Dasar
di Kediri

No : Jenis Dokumen yang dikirim : Banyaknya : Keterangan
1. : Laporan Realisasi Dana BOS Tahap ... : 3 (Tiga) Bendel : Dikirim dengan hormat untuk mendapatkan penyelesaian lebih lanjut.
2. : ........................................... : ....... : ...........................................

Demikian surat pengantar ini dibuat untuk digunakan sebagaimana mestinya.

Diterima Tanggal : ...................
Penerima : ...................`
  },
  {
    id: 't_sk_panitia',
    name: 'SK Kepala Sekolah (Keputusan)',
    subject: 'KEPUTUSAN KEPALA SD NEGERI [NAMA_SEKOLAH]',
    category: 'Keputusan',
    layout: 'centered',
    content: `TENTANG
PEMBENTUKAN PANITIA UJIAN SATUAN PENDIDIKAN (USP)
TAHUN PELAJARAN 2024/2025

Menimbang : a. Bahwa dalam rangka memperlancar pelaksanaan Ujian Satuan Pendidikan (USP), perlu dibentuk panitia pelaksana.
Menimbang : b. Bahwa nama-nama yang tercantum dalam lampiran keputusan ini dianggap mampu melaksanakan tugas.

Mengingat : 1. Undang-Undang Nomor 20 Tahun 2003 tentang Sistem Pendidikan Nasional.
Mengingat : 2. Peraturan Pemerintah Nomor 19 Tahun 2005 tentang Standar Nasional Pendidikan.

MEMUTUSKAN

Menetapkan :
PERTAMA : Membentuk Panitia Ujian Satuan Pendidikan sebagaimana tercantum dalam lampiran keputusan ini.
KEDUA : Segala biaya yang timbul dibebankan pada anggaran BOS Sekolah.
KETIGA : Keputusan ini berlaku sejak tanggal ditetapkan.

[PAGE_BREAK]

LAMPIRAN : KEPUTUSAN KEPALA SEKOLAH
NOMOR : [NOMOR_SURAT]
TANGGAL : [TANGGAL_SURAT]

SUSUNAN PANITIA UJIAN SATUAN PENDIDIKAN (USP)
TAHUN PELAJARAN 2024/2025

No : Nama : Jabatan Kedinasan : Jabatan Panitia
1. : [NAMA_KEPSEK] : Kepala Sekolah : Penanggung Jawab
2. : ....................... : Guru Kelas : Ketua Panitia
3. : ....................... : Guru Mapel : Sekretaris
4. : ....................... : Bendahara Sekolah : Bendahara

Ditetapkan di : Kediri
Pada Tanggal : [TANGGAL_SURAT]`
  },
  {
    id: 't_permohonan_narsum',
    name: 'Surat Permohonan Narasumber',
    subject: 'PERMOHONAN MENJADI NARASUMBER',
    category: 'Permohonan',
    layout: 'standard',
    content: `Kepada Yth.
...........................................
di Tempat

Dengan hormat,

Dalam rangka meningkatkan kompetensi guru di lingkungan SDN [NAMA_SEKOLAH], kami bermaksud mengadakan kegiatan workshop dengan tema "...........................................".

Sehubungan dengan hal tersebut, kami memohon kesediaan Bapak/Ibu untuk menjadi Narasumber dalam kegiatan yang akan dilaksanakan pada:

Hari / Tanggal : ...................................................
Waktu : ...................................................
Tempat : Aula SDN [NAMA_SEKOLAH]

Demikian permohonan ini kami sampaikan. Besar harapan kami Bapak/Ibu dapat memenuhi permohonan ini. Atas perhatian dan kesediaannya kami ucapkan terima kasih.`
  }
];

export const MOCK_INITIAL_DATA = [];

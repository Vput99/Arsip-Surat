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

Untuk : 1. Menghadiri kegiatan koordinasi peningkatan mutu pendidikan pada tanggal ... di ...
Untuk : 2. Melaporkan hasil pelaksanaan tugas secara tertulis kepada Kepala Sekolah.

Demikian surat tugas ini dibuat untuk dilaksanakan dengan penuh tanggung jawab.

[PAGE_BREAK]

LAMPIRAN : SURAT PERINTAH TUGAS
NOMOR : [NOMOR_SURAT]
TANGGAL : [TANGGAL_SURAT]

DAFTAR PERSONIL PELAKSANA TUGAS :

No : Nama : NIP : Jabatan : Keterangan
1. : [NAMA_PETUGAS] : [NIP_PETUGAS] : [JABATAN_PETUGAS] : Peserta
2. : ....................... : ....................... : Guru Kelas : Peserta
3. : ....................... : ....................... : Staff TU : Pendamping

Ditetapkan di : Kediri
Pada Tanggal : [TANGGAL_SURAT]`
  },
  {
    id: 't_pip_aktivasi',
    name: 'Surat Keterangan Aktivasi PIP',
    subject: 'SURAT KETERANGAN AKTIVASI REKENING SIMPEL PIP',
    category: 'Dinas',
    layout: 'centered',
    content: `Yang bertanda tangan di bawah ini :

Nama : [NAMA_KEPSEK]
NIP : [NIP_KEPSEK]
Jabatan : Kepala Sekolah
Satuan Pendidikan : SDN [NAMA_SEKOLAH]

Dengan ini menerangkan bahwa nama-nama tersebut di bawah ini adalah benar Peserta Didik SDN [NAMA_SEKOLAH] dan yang bersangkutan sebagai Penerima Dana PIP Tahun Anggaran 2024/2025:

NO : NAMA PESERTA DIDIK (SESUAI SK) : KELAS : NOMOR REKENING : PIP ID / VIRTUAL ACCOUNT
1. : ................................................... : ....... : ........................................... : ...........................................
2. : ................................................... : ....... : ........................................... : ...........................................
3. : ................................................... : ....... : ........................................... : ...........................................

Demikian surat keterangan ini dibuat untuk digunakan sebagai salah satu persyaratan melakukan aktivasi rekening SimPel PIP pada Bank Penyalur (BRI/BNI).`
  },
  {
    id: 't_panggilan_ortu',
    name: 'Surat Panggilan Orang Tua',
    subject: 'UNDANGAN PANGGILAN ORANG TUA / WALI MURID',
    category: 'Undangan',
    layout: 'standard',
    content: `Dengan hormat,

Sehubungan dengan adanya hal penting terkait perkembangan pendidikan putra/putri Bapak/Ibu, kami mengharap kehadiran Bapak/Ibu Wali Murid pada:

Hari / Tanggal : ...................................................
Waktu : ...................................................
Tempat : Ruang Kepala Sekolah / Ruang Guru
Keperluan : Koordinasi Pembinaan dan Evaluasi Belajar Peserta Didik

Mengingat pentingnya acara tersebut, kami mengharap kehadiran Bapak/Ibu tepat pada waktunya dan tidak diwakilkan.

Demikian undangan ini kami sampaikan, atas perhatian dan kerjasamanya kami ucapkan terima kasih.`
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
    id: 't_mutasi_keluar',
    name: 'Surat Keterangan Pindah (Mutasi)',
    subject: 'SURAT KETERANGAN PINDAH SEKOLAH',
    category: 'Mutasi',
    layout: 'centered',
    content: `Yang bertanda tangan di bawah ini Kepala Sekolah Dasar Negeri [NAMA_SEKOLAH] menerangkan bahwa :

Nama Siswa : ...................................................
Tempat / Tgl Lahir : ...................................................
Nomor Induk / NISN : ...................................................
Jenis Kelamin : ...................................................
Siswa Kelas : ...................................................

Telah mengajukan pindah sekolah atas permintaan orang tua ke :

Nama Sekolah Tujuan : ...................................................
Alamat Sekolah Tujuan : ...................................................
Alasan Pindah : ...................................................

Bersama ini kami lampirkan buku laporan pendidikan (Raport) siswa yang bersangkutan. Demikian surat keterangan ini dibuat untuk dipergunakan sebagaimana mestinya.`
  }
];

export const MOCK_INITIAL_DATA = [];
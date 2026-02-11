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
2. Kalender Pendidikan Tahun Pelajaran 2024/2025.

MEMERINTAHKAN :

Kepada :
Nama : ...........................................................
NIP : ...........................................................
Pangkat/Gol : ...........................................................
Jabatan : ...........................................................

Untuk : 1. Menghadiri Workshop Peningkatan Mutu Guru pada tanggal 20-22 Mei 2025.
2. Melaporkan hasil pelaksanaan tugas kepada Kepala Sekolah.

Demikian surat tugas ini dibuat untuk dilaksanakan dengan penuh tanggung jawab.

[PAGE_BREAK]

LAMPIRAN : SURAT PERINTAH TUGAS
NOMOR : [NOMOR_SURAT]
TANGGAL : [TANGGAL_SURAT]

DAFTAR PERSONIL PELAKSANA TUGAS :

No : Nama : NIP : Jabatan : Keterangan
1. : ....................... : ....................... : Guru Kelas : Peserta
2. : ....................... : ....................... : Guru Mapel : Peserta
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

Nama : ...........................................................
NIP : ...........................................................
Jabatan : Kepala Sekolah
Satuan Pendidikan : SDN [NAMA_SEKOLAH]

dengan ini menerangkan bahwa nama-nama tersebut di bawah ini, adalah benar Peserta Didik SDN [NAMA_SEKOLAH] dan yang bersangkutan sebagai Penerima PIP Tahun 2025:

No : Nama Peserta Didik Tertera di SK : Kelas : Nomor Rekening : PIP ID/Virtual Account
1. : ................................................... : ....... : ........................................... : ...........................................

Demikian surat keterangan ini dibuat untuk digunakan sebagai salah satu persyaratan untuk melakukan aktivasi rekening SimPel PIP di bank penyalur.`
  },
  {
    id: 't_sptjm_uang_makan',
    name: 'SPTJM Uang Makan',
    subject: 'SURAT PERNYATAAN PERTANGGUNG JAWABAN MUTLAK',
    category: 'Dinas',
    layout: 'centered',
    content: `Yang bertanda tangan di bawah ini :

Nama : ...........................................................
NIP : ...........................................................
Jabatan : Kepala Sekolah Dasar Negeri [NAMA_SEKOLAH]

Dengan ini menyatakan dengan sebenarnya bahwa :

1. Perhitungan yang terdapat pada Daftar Perhitungan uang makan bulan berjalan SDN [NAMA_SEKOLAH] telah dihitung dengan benar dan berdasarkan daftar hadir Pegawai Negeri Sipil pada SDN [NAMA_SEKOLAH].

2. Apabila dikemudian hari terdapat kelebihan atas pembayaran uang makan tersebut kami bersedia untuk menyetorkan kelebihan tersebut ke Kas Negara.

Demikian surat pernyataan ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.`
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

Menimbang : a. bahwa dalam rangka memperlancar pelaksanaan Ujian Satuan Pendidikan (USP), perlu dibentuk panitia pelaksana.
b. bahwa nama-nama yang tercantum dalam lampiran keputusan ini dianggap mampu melaksanakan tugas.

Mengingat : 1. Undang-Undang Nomor 20 Tahun 2003 tentang Sistem Pendidikan Nasional.
2. Peraturan Pemerintah Nomor 19 Tahun 2005 tentang Standar Nasional Pendidikan.

MEMUTUSKAN

Menetapkan :
PERTAMA : Membentuk Panitia Ujian Satuan Pendidikan sebagaimana tercantum dalam lampiran.
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
2. : ....................... : Guru : Ketua Panitia
3. : ....................... : Guru : Sekretaris
4. : ....................... : Staff TU : Bendahara

Ditetapkan di : Kediri
Pada Tanggal : [TANGGAL_SURAT]`
  },
  {
    id: 't_mou_ekskul',
    name: 'MOU Pengajar Ekstrakurikuler',
    subject: 'PERJANJIAN KERJA SAMA JASA PENGAJAR EKSTRAKURIKULER',
    category: 'Kerjasama',
    layout: 'centered',
    content: `Pada hari ini ............, Tanggal ............ Bulan ............ Tahun ............, bertempat di SDN [NAMA_SEKOLAH], kami yang bertanda tangan di bawah ini:

I. Nama : [NAMA_KEPSEK]
   Jabatan : Kepala Sekolah Dasar Negeri [NAMA_SEKOLAH]
   Alamat : [ALAMAT_SEKOLAH]
   Selanjutnya disebut sebagai PIHAK PERTAMA.

II. Nama : ...........................................................
   Alamat : ...........................................................
   Keahlian : Pelatih Bidang ...........................................
   Selanjutnya disebut sebagai PIHAK KEDUA.

Kedua belah pihak sepakat untuk melakukan Perjanjian Kerja Sama Jasa Pengajar Ekstrakurikuler dengan ketentuan sebagai berikut:

PASAL 1 - LINGKUP PEKERJAAN
PIHAK PERTAMA memberikan tugas kepada PIHAK KEDUA untuk menjadi pelatih ekstrakurikuler ........................... pada tahun pelajaran 2024/2025.

PASAL 2 - JADWAL KEGIATAN
Kegiatan dilaksanakan setiap hari ........................... pukul ........................... WIB bertempat di lingkungan sekolah atau lokasi lain yang disepakati.

[PAGE_BREAK]

PASAL 3 - HAK DAN KEWAJIBAN
1. PIHAK KEDUA wajib menyusun program kerja ekstrakurikuler dan melaporkan progres latihan secara berkala kepada koordinator kesiswaan.
2. PIHAK PERTAMA berhak mengevaluasi kinerja dan kedisiplinan PIHAK KEDUA.
3. PIHAK KEDUA berhak mendapatkan honorarium sesuai dengan ketentuan anggaran sekolah yang berlaku.

PASAL 4 - HONORARIUM AND PEMBAYARAN
Besaran upah jasa pengajar disepakati sebesar Rp ........................... per pertemuan yang akan dibayarkan setiap akhir bulan berdasarkan daftar hadir yang sah.

PASAL 5 - PENUTUP
Demikian perjanjian ini dibuat dalam rangkap 2 (dua) untuk dipergunakan sebagaimana mestinya.`
  },
  {
    id: 't_honor_ekskul',
    name: 'Daftar Honor Ekstrakurikuler',
    subject: 'DAFTAR PENERIMAAN HONORARIUM PELATIH EKSTRAKURIKULER',
    category: 'Kerjasama',
    layout: 'centered',
    content: `Bulan : ...........................................................
Tahun Pelajaran : ...........................................................

No : Nama Pelatih : Ekstrakurikuler : Jml Pertemuan : Honor/Sesi : Total : Tanda Tangan
1. : ....................... : Pramuka : ..... : Rp ........... : Rp ........... : 1. ........
2. : ....................... : Tari : ..... : Rp ........... : Rp ........... : 2. ........
3. : ....................... : Karate : ..... : Rp ........... : Rp ........... : 3. ........
4. : ....................... : Drumband : ..... : Rp ........... : Rp ........... : 4. ........
5. : ....................... : Keagamaan : ..... : Rp ........... : Rp ........... : 5. ........

JUMLAH TOTAL : Rp ............................

Pembayaran dilakukan berdasarkan absensi kehadiran pelatih yang telah diverifikasi.`
  },
  {
    id: 't_undangan_wali',
    name: 'Surat Undangan Wali Murid',
    subject: 'Undangan Rapat Pleno Komite Sekolah',
    category: 'Undangan',
    layout: 'standard',
    content: `Dengan hormat,

Sehubungan dengan akan dilaksanakannya evaluasi program sekolah semester genap, kami mengharapkan kehadiran Bapak/Ibu Wali Murid pada:

Hari/Tanggal : .........................................
Waktu : 08.00 WIB s.d Selesai
Tempat : Aula Serbaguna SDN [NAMA_SEKOLAH]
Acara : Rapat Pleno Komite dan Sosialisasi Program Sekolah.

Mengingat pentingnya acara ini, dimohon kehadiran Bapak/Ibu tepat waktu tanpa mewakilkan.

Demikian undangan ini kami sampaikan, atas perhatian dan kerjasamanya kami ucapkan terima kasih.`
  },
  {
    id: 't_mou_tukang_harian',
    name: 'MOU Jasa Tukang (Upah Harian)',
    subject: 'SURAT PERJANJIAN KERJA JASA PERBAIKAN (UPAH HARIAN)',
    category: 'Kerjasama',
    layout: 'centered',
    content: `Pada hari ini ............, Tanggal ............ Bulan ............ Tahun ............, kami yang bertanda tangan di bawah ini:

I. Nama : [NAMA_KEPSEK]
   Jabatan : Kepala Sekolah Dasar Negeri [NAMA_SEKOLAH]
   Alamat : [ALAMAT_SEKOLAH]
   Selanjutnya disebut sebagai PIHAK PERTAMA.

II. Nama : ...........................................................
   Alamat : ...........................................................
   Pekerjaan : Tukang / Pekerja Bangunan
   Selanjutnya disebut sebagai PIHAK KEDUA.

Kedua belah pihak sepakat untuk melakukan Perjanjian Kerja Jasa Perbaikan dengan upah harian.`
  }
];

// Mock initial data for mails fallback
export const MOCK_INITIAL_DATA = [];

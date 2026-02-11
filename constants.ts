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

PASAL 4 - HONORARIUM DAN PEMBAYARAN
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
   NIK : ...........................................................
   Alamat : ...........................................................
   Selanjutnya disebut sebagai PIHAK KEDUA.

Kedua belah pihak sepakat untuk mengadakan perjanjian kerja jasa perbaikan sarana sekolah dengan sistem UPAH HARIAN:

PASAL 1 - LINGKUP PEKERJAAN
PIHAK PERTAMA menunjuk PIHAK KEDUA untuk melaksanakan pekerjaan perbaikan sarana prasarana sekolah berupa perbaikan atap dan pengecatan ruang kelas.

PASAL 2 - UPAH DAN PEMBAYARAN
Besaran upah harian yang disepakati adalah Rp ............................ per hari kerja yang dibayarkan setiap akhir pekan.

PASAL 3 - PENUTUP
Demikian perjanjian ini dibuat dengan sebenar-benarnya.`
  },
  {
    id: 't_sppd',
    name: 'Surat Perintah Perjalanan Dinas (SPPD)',
    subject: 'SURAT PERINTAH PERJALANAN DINAS (SPPD)',
    category: 'Tugas',
    layout: 'centered',
    content: `Lembar Ke : ...................................
Kode No : ...................................

1. Pejabat Berwenang : Kepala Sekolah SDN [NAMA_SEKOLAH]
2. Nama Pegawai : ...........................................................
3. a. Pangkat/Gol : ...........................................................
   b. Jabatan : ...........................................................
4. Maksud Perjalanan : ...........................................................
5. Alat Angkut : Kendaraan Pribadi / Umum
6. a. Tempat Berangkat : SDN [NAMA_SEKOLAH]
   b. Tempat Tujuan : ...........................................................
7. a. Lamanya Dinas : ........... ( ........................ ) Hari
   b. Tanggal Berangkat : ...........................................................
   c. Tanggal Kembali : ...........................................................
8. Pembebanan Anggaran : 
   a. Instansi : Dinas Pendidikan
   b. Mata Anggaran : Dana BOS / Komite

[PAGE_BREAK]

SPPD HALAMAN 2 - LAPORAN PELAKSANAAN

I. Tiba di : .........................................
   Pada Tanggal : .........................................
   Kepala / Pejabat setempat :

   ( ........................................... )

II. Berangkat dari : .........................................
    Tiba di : SDN [NAMA_SEKOLAH]
    Pada Tanggal : .........................................

    Pejabat Pelaksana Tugas :

    ( ........................................... )`
  },
  {
    id: 't_mutasi_keluar',
    name: 'Surat Keterangan Pindah (Mutasi)',
    subject: 'SURAT KETERANGAN PINDAH SEKOLAH',
    category: 'Dinas',
    layout: 'centered',
    content: `Yang bertanda tangan di bawah ini Kepala Sekolah Dasar Negeri [NAMA_SEKOLAH], menerangkan bahwa :

Nama : ...........................................................
Tempat/Tgl Lahir : ...........................................................
NISN : ...........................................................
Murid Tingkat / Kelas : ...........................................................

Sesuai Surat permohonan pindah sekolah oleh orang tua / wali murid tanggal ......................., siswa tersebut telah mengajukan pindah ke sekolah tujuan ...........................................................

Demikian Surat Keterangan Pindah Sekolah ini dibuat untuk dapat dipergunakan sebagaimana mestinya.

[PAGE_BREAK]

BUKTI PENERIMAAN (UNTUK ARSIP SEKOLAH)

Nama Siswa : ...........................................................
Diterima di kelas : ...........................................................
Diterima tanggal : ...........................................................
Nama Sekolah : ...........................................................

TANDA TANGAN PENERIMA :

( ........................................... )`
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
  }
];
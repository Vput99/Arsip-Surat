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
    id: 't_honor_ekskul',
    name: 'Daftar Honor Ekstrakurikuler',
    subject: 'DAFTAR PENERIMAAN HONORARIUM PELATIH EKSTRAKURIKULER',
    category: 'Kerjasama',
    layout: 'centered',
    content: `DAFTAR PENERIMAAN HONORARIUM PELATIH EKSTRAKURIKULER
Bulan : ...........................................................
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
    id: 't_rolstan_pekerja',
    name: 'Rolstan / Daftar Hadir & Upah Tukang',
    subject: 'DAFTAR HADIR DAN PENERIMAAN UPAH TENAGA KERJA (ROLSTAN)',
    category: 'Kerjasama',
    layout: 'centered',
    content: `DAFTAR HADIR DAN PENERIMAAN UPAH TENAGA KERJA
Pekerjaan : ...........................................................
Lokasi : SDN [NAMA_SEKOLAH]
Minggu ke / Bulan : ...........................................................

No : Nama Pekerja : Jabatan : Upah/Hari : Hari : Total : Tanda Tangan
1. : ....................... : Tukang : Rp ........... : ..... : Rp ........... : 1. ........
2. : ....................... : Tukang : Rp ........... : ..... : Rp ........... : 2. ........
3. : ....................... : Pekerja : Rp ........... : ..... : Rp ........... : 3. ........
4. : ....................... : Pekerja : Rp ........... : ..... : Rp ........... : 4. ........
5. : ....................... : Pekerja : Rp ........... : ..... : Rp ........... : 5. ........
6. : ....................... : Pekerja : Rp ........... : ..... : Rp ........... : 6. ........

JUMLAH TOTAL : Rp ............................

Catatan: Upah dibayarkan sesuai dengan hari kehadiran nyata di lokasi pekerjaan.`
  },
  {
    id: 't_mou_tukang_harian',
    name: 'MOU Jasa Tukang (Harian/Non-Borongan)',
    subject: 'SURAT PERJANJIAN KERJA JASA PERBAIKAN (UPAH HARIAN)',
    category: 'Kerjasama',
    layout: 'centered',
    content: `SURAT PERJANJIAN KERJA HARIAN
Nomor : [NOMOR_SURAT]

Pada hari ini ............, Tanggal ............ Bulan ............ Tahun ............, kami yang bertanda tangan di bawah ini:

1. Nama : [NAMA_KEPSEK]
   Jabatan : Kepala Sekolah Dasar Negeri [NAMA_SEKOLAH]
   Alamat : [ALAMAT_SEKOLAH]
   Selanjutnya disebut sebagai PIHAK PERTAMA.

2. Nama : ...........................................................
   Pekerjaan : Tukang / Kepala Tukang*
   NIK : ...........................................................
   Alamat : ...........................................................
   Keahlian : ...........................................................
   Selanjutnya disebut sebagai PIHAK KEDUA.

Kedua belah pihak sepakat untuk mengadakan perjanjian kerja jasa perbaikan sarana prasarana sekolah dengan sistem UPAH HARIAN, dengan ketentuan sebagai berikut:

PASAL 1 - LINGKUP PEKERJAAN
PIHAK PERTAMA menunjuk PIHAK KEDUA untuk melaksanakan pekerjaan perbaikan berupa:
1. ...........................................................
2. ...........................................................

PASAL 2 - JANGKA WAKTU DAN JAM KERJA
1. Pekerjaan diperkirakan berlangsung selama ........... hari kerja, terhitung mulai tanggal ...................
2. Jam kerja disepakati mulai pukul 08.00 WIB s.d 16.00 WIB.

PASAL 3 - UPAH DAN SISTEM PEMBAYARAN
1. Besaran upah harian yang disepakati adalah:
   - Kepala Tukang : Rp ............................ / hari
   - Tukang : Rp ............................ / hari
   - Ladang / Pembantu : Rp ............................ / hari
2. Pembayaran upah dilakukan setiap ( Hari Sabtu / Akhir Pekerjaan* ).

PASAL 4 - PENUTUP
Demikian perjanjian ini dibuat dengan sebenar-benarnya untuk dipatuhi oleh kedua belah pihak.`
  },
  {
    id: 't_mou_perbaikan',
    name: 'MOU Perbaikan Bangunan (Sistem Borongan)',
    subject: 'SURAT PERJANJIAN KERJA SAMA PERBAIKAN SARANA PRASARANA (BORONGAN)',
    category: 'Kerjasama',
    layout: 'centered',
    content: `SURAT PERJANJIAN KERJA SAMA
Nomor : [NOMOR_SURAT]

Pada hari ini ............, Tanggal ............ Bulan ............ Tahun ............, kami yang bertanda tangan di bawah ini:

1. Nama : [NAMA_KEPSEK]
   Jabatan : Kepala Sekolah Dasar Negeri [NAMA_SEKOLAH]
   Alamat : [ALAMAT_SEKOLAH]
   Selanjutnya disebut sebagai PIHAK PERTAMA.

2. Nama : ...........................................................
   Pekerjaan : ...........................................................
   Alamat : ...........................................................
   No. HP : ...........................................................
   Selanjutnya disebut sebagai PIHAK KEDUA.

Kedua belah pihak sepakat untuk mengadakan perjanjian kerja sama perbaikan ringan sarana prasarana sekolah dengan sistem BORONGAN sebagai berikut:

PASAL 1 - LINGKUP PEKERJAAN
PIHAK PERTAMA memberikan pekerjaan kepada PIHAK KEDUA, dan PIHAK KEDUA menerima pekerjaan tersebut berupa:
1. ...........................................................
2. ...........................................................

PASAL 2 - JANGKA WAKTU
Pekerjaan tersebut harus diselesaikan dalam jangka waktu ........... ( ........................ ) hari kalender.

PASAL 3 - BIAYA DAN SISTEM PEMBAYARAN
1. Total biaya perbaikan yang disepakati adalah sebesar Rp ............................
2. Pembayaran dilakukan dengan sistem:
   - Uang Muka (DP) : Rp ............................ ( ......... % )
   - Pelunasan : Setelah pekerjaan selesai 100%.

PASAL 4 - PENUTUP
Demikian perjanjian ini dibuat dengan penuh kesadaran tanpa ada paksaan dari pihak manapun.`
  },
  {
    id: 't_mou_ekskul',
    name: 'MOU / Perjanjian Kerja Pengajar Ekskul',
    subject: 'PERJANJIAN KERJA SAMA TENAGA PENGAJAR EKSTRAKURIKULER',
    category: 'Kerjasama',
    layout: 'centered',
    content: `SURAT PERJANJIAN KERJA SAMA
Nomor : [NOMOR_SURAT]

Pada hari ini ............, Tanggal ............ Bulan ............ Tahun ............, bertempat di [NAMA_SEKOLAH], kami yang bertanda tangan di bawah ini:

1. Nama : [NAMA_KEPSEK]
   Jabatan : Kepala Sekolah Dasar Negeri [NAMA_SEKOLAH]
   Alamat : [ALAMAT_SEKOLAH]
   Dalam hal ini bertindak untuk dan atas nama SDN [NAMA_SEKOLAH], selanjutnya disebut PIHAK PERTAMA.

2. Nama : ...........................................................
   Alamat : ...........................................................
   Keahlian : ...........................................................
   Selanjutnya disebut PIHAK KEDUA.

Kedua belah pihak telah sepakat untuk mengadakan Perjanjian Kerja Sama sebagai Tenaga Pengajar Ekstrakurikuler ............................ dengan ketentuan sebagai berikut:

PASAL 1 - TUGAS DAN LINGKUP PEKERJAAN
1. PIHAK PERTAMA memberikan tugas kepada PIHAK KEDUA untuk melaksanakan bimbingan ekstrakurikuler.
2. PIHAK KEDUA wajib menyusun Program Kerja tahunan.

PASAL 2 - JANGKA WAKTU
Perjanjian ini berlaku selama 1 (satu) tahun pelajaran.

PASAL 3 - HONORARIUM (GAJI)
PIHAK KEDUA berhak menerima honorarium sebesar Rp ............................ per pertemuan.

PASAL 4 - PENUTUP
Demikian surat perjanjian ini dibuat dalam rangkap 2 (dua) untuk dipergunakan sebagaimana mestinya.`
  },
  {
    id: 't_sppd',
    name: 'Surat Perintah Perjalanan Dinas (SPPD) Resmi',
    subject: 'SURAT PERINTAH PERJANJAN DINAS (SPPD)',
    category: 'Tugas',
    layout: 'centered',
    content: `Lembar Ke : ...................................
Kode No : ...................................
Nomor : [NOMOR_SURAT]

1. Pejabat Berwenang yang memberi perintah : Kepala Sekolah Dasar Negeri [NAMA_SEKOLAH]
2. Nama Pegawai yang diperintah : ...........................................................
3. a. Pangkat dan Golongan : ...........................................................
   b. Jabatan / Instansi : ...........................................................
4. Maksud Perjalanan Dinas : ...........................................................
5. Alat angkut yang dipergunakan : ...........................................................
6. a. Tempat Berangkat : [NAMA_SEKOLAH]
   b. Tempat Tujuan : ...........................................................
7. a. Lamanya Perjalanan Dinas : ........... ( ........................ ) Hari
   b. Tanggal Berangkat : ...........................................................
   c. Tanggal Harus Kembali : ...........................................................
8. Pembebanan Anggaran : 
   a. Instansi : Dinas Pendidikan Kota Kediri
   b. Mata Anggaran : ...........................................................`
  },
  {
    id: 't_spt',
    name: 'Surat Perintah Tugas (SPT)',
    subject: 'SURAT PERINTAH TUGAS',
    category: 'Tugas',
    layout: 'centered',
    content: `Dasar : ............................................................................................

MENUGASKAN :

Kepada :
Nama : ...........................................................
NIP : ...........................................................
Jabatan : ...........................................................

Untuk : ............................................................................................

Tempat : ...........................................................
Waktu : ...........................................................

Demikian surat tugas ini dibuat untuk dilaksanakan dengan penuh tanggung jawab.`
  },
  {
    id: 't_mutasi_masuk',
    name: 'Surat Keterangan Menerima Siswa Pindahan',
    subject: 'SURAT KETERANGAN MENERIMA SISWA PINDAHAN',
    category: 'Dinas',
    layout: 'centered',
    content: `Yang bertanda tangan di bawah ini :

Nama : ........................................................................
NIP : ........................................................................
Jabatan : Kepala Sekolah

Menerangkan Bahwa :

Nama : ........................................................................
Tempat/Tgl Lahir : ........................................................................
Kelas : ........................................................................
Nama Sekolah Asal : ........................................................................

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
NISN : ...........................................................
Murid Tingkat / Kelas : ...........................................................

Sesuai Surat permohonan pindah sekolah oleh orang tua / wali murid :

Nama : ...........................................................
Pekerjaan : ...........................................................

Telah mengajukan pindah ke salah satu Sekolah ...........................................................

Demikian Surat Keterangan Pindah Sekolah ini dibuat untuk dapat dipergunakan sebagaimana mestinya.

✂-CUT-LINE

NSS : [ ][ ][ ][ ][ ][ ][ ][ ][ ][ ][ ][ ]

Nama Sekolah : ...........................................................
Alamat : ...........................................................
Nama Siswa : ...........................................................
Diterima di kelas : ...........................................................
Diterima tanggal : ...........................................................`
  },
  {
    id: 't_laporan',
    name: 'Laporan Perjalanan Dinas',
    subject: 'LAPORAN PERINTAH DINAS',
    category: 'Dinas',
    layout: 'centered',
    signatureTitle: 'Pelaksana Perjalanan Dinas',
    content: `I. DASAR
............................................................................................

II. MAKSUD & TUJUAN
............................................................................................

III. WAKTU PELAKSANAAN
Hari : ........................
Tanggal : ........................

IV. PELAKSANA PERJALANAN DINAS
............................................................................................

V. DAERAH TUJUAN/INSTANSI
............................................................................................

VI. PETUNJUK/ARAHAN
............................................................................................

VII. MASALAH/TEMUAN
............................................................................................`
  },
  {
    id: 't1',
    name: 'Surat Undangan Wali Murid',
    subject: 'Undangan Pengambilan Rapor',
    category: 'Undangan',
    layout: 'standard',
    content: `Dengan hormat,

Sehubungan dengan berakhirnya kegiatan pembelajaran, kami mengundang Bapak/Ibu Wali Murid untuk hadir pada:

Hari/Tanggal : [HARI], [TANGGAL]
Pukul : 08.00 WIB - Selesai
Tempat : Ruang Kelas [KELAS]
Acara : Pengambilan Rapor

Mengingat pentingnya acara ini, kami mengharapkan kehadiran Bapak/Ibu tepat pada waktunya.

Demikian undangan ini kami sampaikan.`
  },
  {
    id: 't3',
    name: 'Surat Keterangan Siswa',
    subject: 'Surat Keterangan Aktif Sekolah',
    category: 'Dinas',
    layout: 'standard',
    content: `Yang bertanda tangan di bawah ini Kepala Sekolah Dasar Negeri [NAMA_SEKOLAH], menerangkan bahwa:

Nama : [NAMA_SISWA]
NISN : [NISN]
Kelas : [KELAS]

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
  }
];
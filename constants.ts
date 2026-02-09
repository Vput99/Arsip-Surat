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
3. ...........................................................

PASAL 2 - JANGKA WAKTU DAN JAM KERJA
1. Pekerjaan diperkirakan berlangsung selama ........... hari kerja, terhitung mulai tanggal ...................
2. Jam kerja disepakati mulai pukul 08.00 WIB s.d 16.00 WIB (dengan waktu istirahat 1 jam).
3. Apabila diperlukan kerja lembur, hal tersebut harus atas persetujuan PIHAK PERTAMA.

PASAL 3 - UPAH DAN SISTEM PEMBAYARAN
1. Besaran upah harian yang disepakati adalah:
   - Kepala Tukang : Rp ............................ / hari
   - Tukang : Rp ............................ / hari
   - Ladang / Pembantu : Rp ............................ / hari
2. Pembayaran upah dilakukan setiap ( Hari Sabtu / Akhir Pekerjaan* ).
3. PIHAK PERTAMA tidak menanggung biaya makan dan rokok, kecuali ditentukan lain atas kebijaksanaan sekolah.

PASAL 4 - PENYEDIAAN MATERIAL DAN ALAT
1. Semua material/bahan bangunan disediakan oleh PIHAK PERTAMA.
2. PIHAK KEDUA berkewajiban menyiapkan alat-alat kerja standar milik pribadi.
3. PIHAK KEDUA wajib menginformasikan kebutuhan material kepada PIHAK PERTAMA minimal 1 (satu) hari sebelum material tersebut habis/digunakan agar pekerjaan tidak terhambat.

PASAL 5 - TANGGUNG JAWAB DAN KEAMANAN
1. PIHAK KEDUA bertanggung jawab atas kualitas hasil kerja yang rapi dan kuat.
2. PIHAK KEDUA wajib menjaga ketertiban dan tidak mengganggu jalannya kegiatan belajar mengajar di lingkungan sekolah.
3. Segala resiko kecelakaan kerja yang disebabkan oleh kelalaian PIHAK KEDUA menjadi tanggung jawab PIHAK KEDUA.

PASAL 6 - PENUTUP
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
(Sebutkan rincian seperti pengecatan, perbaikan atap, atau pintu)

PASAL 2 - JANGKA WAKTU
Pekerjaan tersebut harus diselesaikan dalam jangka waktu ........... ( ........................ ) hari kalender, terhitung sejak tanggal ditetapkan.

PASAL 3 - BIAYA DAN SISTEM PEMBAYARAN
1. Total biaya perbaikan yang disepakati adalah sebesar Rp ............................ ( ........................................................... ).
2. Biaya tersebut sudah termasuk upah tenaga kerja dan bahan bangunan (jika disepakati borongan).
3. Pembayaran dilakukan dengan sistem:
   - Uang Muka (DP) : Rp ............................ ( ......... % )
   - Pelunasan : Setelah pekerjaan selesai 100% dan diperiksa.

PASAL 4 - KUALITAS PEKERJAAN
1. PIHAK KEDUA wajib menggunakan bahan bangunan dengan kualitas yang baik sesuai standar yang disepakati.
2. Apabila hasil pekerjaan tidak sesuai atau terdapat kerusakan dalam waktu 1 minggu setelah selesai, PIHAK KEDUA wajib melakukan perbaikan kembali tanpa biaya tambahan.

PASAL 5 - PENUTUP
Demikian perjanjian ini dibuat dengan penuh kesadaran tanpa ada paksaan dari pihak manapun untuk dipergunakan sebagaimana mestinya.`
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
   Tempat/Tgl Lahir : ...........................................................
   Alamat : ...........................................................
   Keahlian : ...........................................................
   Dalam hal ini bertindak untuk dan atas nama pribadi, selanjutnya disebut PIHAK KEDUA.

Kedua belah pihak telah sepakat untuk mengadakan Perjanjian Kerja Sama sebagai Tenaga Pengajar Ekstrakurikuler ............................ dengan ketentuan sebagai berikut:

PASAL 1 - TUGAS DAN LINGKUP PEKERJAAN
1. PIHAK PERTAMA memberikan tugas kepada PIHAK KEDUA untuk melaksanakan bimbingan ekstrakurikuler kepada siswa-siswi SDN [NAMA_SEKOLAH].
2. PIHAK KEDUA wajib menyusun Program Kerja tahunan dan Absensi Kehadiran Siswa di setiap pertemuan.

PASAL 2 - JANGKA WAKTU
Perjanjian ini berlaku selama 1 (satu) tahun pelajaran, terhitung sejak tanggal ditetapkan dan dapat diperpanjang atas kesepakatan kedua belah pihak setelah melalui evaluasi kinerja.

PASAL 3 - WAKTU PELAKSANAAN
Kegiatan ekstrakurikuler dilaksanakan sesuai jadwal yang telah ditentukan yaitu:
Hari : ...........................................................
Pukul : ........................................................... s.d ...........................................................

PASAL 4 - HONORARIUM (GAJI) DAN PEMBAYARAN
1. PIHAK KEDUA berhak menerima honorarium sebesar Rp ............................ ( ........................................................... ) per pertemuan/bulan*.
2. Pembayaran honorarium dilakukan oleh Bendahara Sekolah pada minggu pertama setiap bulannya melalui dana [SUMBER_DANA_BOS/KOMITE].
3. Pembayaran dilakukan secara tunai/transfer setelah PIHAK KEDUA menyerahkan daftar hadir dan laporan kegiatan bulanan.

PASAL 5 - HAK DAN KEWAJIBAN
1. PIHAK PERTAMA berhak mengevaluasi metode pengajaran yang diberikan oleh PIHAK KEDUA.
2. PIHAK KEDUA wajib menjaga ketertiban, keamanan, dan kebersihan sarana prasarana sekolah selama kegiatan berlangsung.
3. PIHAK KEDUA wajib memberikan laporan perkembangan kemampuan siswa di setiap akhir semester.

PASAL 6 - PEMUTUSAN HUBUNGAN KERJA
PIHAK PERTAMA berhak memutus perjanjian ini secara sepihak apabila:
1. PIHAK KEDUA tidak hadir 3 (tiga) kali berturut-turut tanpa alasan yang sah.
2. PIHAK KEDUA melakukan tindakan yang melanggar norma hukum dan norma susila di lingkungan sekolah.

PASAL 7 - PENUTUP
Demikian surat perjanjian ini dibuat dalam rangkap 2 (dua) di atas materai yang cukup, di mana masing-masing mempunyai kekuatan hukum yang sama.`
  },
  {
    id: 't_sppd',
    name: 'Surat Perintah Perjalanan Dinas (SPPD) Resmi',
    subject: 'SURAT PERINTAH PERJALANAN DINAS (SPPD)',
    category: 'Tugas',
    layout: 'centered',
    content: `Lembar Ke : ...................................
Kode No : ...................................
Nomor : [NOMOR_SURAT]

1. Pejabat Berwenang yang memberi perintah : Kepala Sekolah Dasar Negeri [NAMA_SEKOLAH]
2. Nama Pegawai yang diperintah : ...........................................................
3. a. Pangkat dan Golongan menurut PP No. 6 Tahun 1997 : ...........................................................
   b. Jabatan / Instansi : ...........................................................
   c. Tingkat menurut peraturan perjalanan : ...........................................................
4. Maksud Perjalanan Dinas : ...........................................................
5. Alat angkut yang dipergunakan : ...........................................................
6. a. Tempat Berangkat : [NAMA_SEKOLAH]
   b. Tempat Tujuan : ...........................................................
7. a. Lamanya Perjalanan Dinas : ........... ( ........................ ) Hari
   b. Tanggal Berangkat : ...........................................................
   c. Tanggal Harus Kembali : ...........................................................
8. Pengikut : Nama / NIP
   1. ...........................................................
   2. ...........................................................
9. Pembebanan Anggaran : 
   a. Instansi : Dinas Pendidikan Kota Kediri
   b. Mata Anggaran : ...........................................................
10. Keterangan Lain-lain : ...........................................................`
  },
  {
    id: 't_spt',
    name: 'Surat Perintah Tugas (SPT)',
    subject: 'SURAT PERINTAH TUGAS',
    category: 'Tugas',
    layout: 'centered',
    content: `Dasar : ............................................................................................
        ............................................................................................

MENUGASKAN :

Kepada :
Nama : ...........................................................
NIP : ...........................................................
Pangkat/Gol : ...........................................................
Jabatan : ...........................................................

Untuk : ............................................................................................
      ............................................................................................

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
Unit Kerja : ........................................................................
Alamat : ........................................................................

Menerangkan Bahwa :

Nama : ........................................................................
Tempat/Tgl Lahir : ........................................................................
Kelas : ........................................................................
Nama Sekolah Asal : ........................................................................
Alamat : ........................................................................

Bahwa yang bersangkutan DITERIMA sebagai siswa di Sekolah Dasar Negeri ......................................

Demikian Surat Keterangan ini, agar dapat dipergunakan mestinya.`
  },
  {
    id: 't_mutasi_keluar',
    name: 'Surat Keterangan Pindah Sekolah (Mutasi Keluar)',
    subject: 'SURAT KETERANGAN PINDAH SEKOLAH',
    category: 'Dinas',
    layout: 'centered',
    content: `Yang bertanda tangan di bawah ini Kepala Sekolah Dasar Negeri [NAMA_SEKOLAH] Kecamatan Pesantren Kota Kediri Provinsi Jawa Timur, menerangkan bahwa :

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

Yang bersangkutan belum memiliki Buku Laporan Hasil Belajar ( Raport ) maka bersangkutan akan membawa Surat permohonan pindah orang tua/ wali murid.

Demikian Surat Keterangan Pindah Sekolah ini dibuat untuk dapat dipergunakan sebagaimana mestinya.

(Area Tanda Tangan Kepala Sekolah Asal - Silakan Edit manual jika perlu)

Kediri, ...........................................
Kepala Sekolah,


( ........................................... )
NIP. ...........................................

✂-CUT-LINE

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
    id: 't_laporan',
    name: 'Laporan Perjalanan Dinas',
    subject: 'LAPORAN PERJALANAN DINAS',
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

VI. HADIR DALAM PERTEMUAN
............................................................................................

VII. PETUNJUK/ARAHAN
............................................................................................

VIII. MASALAH/TEMUAN
............................................................................................

IX. SARAN TINDAKAN
............................................................................................

X. LIAN-LIAN
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
Pukul : 08.00 WIB - Selesai
Tempat : Ruang Kelas [KELAS]
Acara : Pengambilan Rapor Semester Genap

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
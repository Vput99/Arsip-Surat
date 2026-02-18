
import { MailType, MailStatus, UrgencyLevel } from './types';

export const APP_NAME = "ArsipSurat SD";

export const CATEGORIES = [
  "Undangan",
  "Dinas",
  "Absensi",
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
    id: 't_undangan_ortu',
    name: 'Undangan Wali Murid',
    subject: 'Undangan Pertemuan Orang Tua',
    category: 'Undangan',
    layout: 'standard',
    content: `Yth. Orang Tua/Wali Murid
Kelas [KELAS]
SDN Tempurejo 1
di Tempat

Dengan hormat,

Mengharap kehadiran Bapak/Ibu orang tua/wali murid SDN Tempurejo 1 untuk hadir dalam pertemuan orang tua murid yang akan diadakan pada:

Hari, tanggal : [HARI_TANGGAL]
Pukul         : [WAKTU]
Tempat        : [TEMPAT_RAPAT]

Agenda pertemuan:
1. Sosialisasi agenda kegiatan pembelajaran dan program sekolah.
2. Pemilihan pengurus paguyuban wali murid.
3. Pertemuan orang tua murid dengan wali kelas.

Mengingat pentingnya acara ini, kehadiran Bapak/Ibu mohon tidak diwakilkan dan hadir tepat waktu. Demikian surat undangan ini kami sampaikan. Atas kehadiran dan kerja sama Bapak/Ibu, kami mengucapkan banyak terima kasih.

Catatan:
1. Bapak/Ibu mohon menggunakan pakaian yang rapi dan sopan.
2. Bapak/Ibu mohon membawa botol minum (tumbler) sendiri.
3. Mohon hadir 15 menit sebelum acara dimulai.`
  },
  {
    id: 't_mou_ekskul',
    name: 'MOU Pengajar Ekskul',
    subject: 'PERJANJIAN KERJA SAMA (PKS) TENAGA PENGAJAR EKSTRAKURIKULER',
    category: 'Kerjasama',
    layout: 'centered',
    content: `PERJANJIAN KERJA SAMA (PKS)
ANTARA
SD NEGERI TEMPUREJO 1
DENGAN
PENGAJAR EKSTRAKURIKULER [NAMA_EKSKUL]

Pada hari ini [HARI], tanggal [TANGGAL_SEKARANG], bertempat di SDN Tempurejo 1, kami yang bertanda tangan di bawah ini:

I. Nama : [NAMA_KEPSEK]
   NIP : [NIP_KEPSEK]
   Jabatan : Kepala Sekolah
   Alamat : [ALAMAT_SEKOLAH]
   Selanjutnya disebut sebagai PIHAK PERTAMA.

II. Nama : [NAMA_PENGAJAR]
    NIK : [NIK_PENGAJAR]
    Alamat : [ALAMAT_PENGAJAR]
    Selanjutnya disebut sebagai PIHAK KEDUA.

Kedua belah pihak telah sepakat untuk mengadakan Perjanjian Kerja Sama pembinaan kegiatan ekstrakurikuler dengan ketentuan sebagai berikut:

Pasal 1
TUGAS DAN TANGGUNG JAWAB
PIHAK KEDUA bertugas sebagai Tenaga Pengajar Ekstrakurikuler [NAMA_EKSKUL] pada SDN Tempurejo 1 dan bertanggung jawab penuh atas pelaksanaan kegiatan serta pengembangan minat bakat siswa.

Pasal 2
HONORARIUM
PIHAK PERTAMA memberikan honorarium kepada PIHAK KEDUA sebesar Rp. [NOMINAL] per pertemuan, yang bersumber dari dana [SUMBER_DANA] sesuai dengan peraturan yang berlaku.

Pasal 3
JANGKA WAKTU
Perjanjian ini berlaku terhitung sejak tanggal [TANGGAL_MULAI] sampai dengan [TANGGAL_SELESAI].

Pasal 4
PENUTUP
Demikian perjanjian ini dibuat dalam rangkap 2 (dua) untuk dilaksanakan dengan penuh tanggung jawab oleh kedua belah pihak.`
  },
  {
    id: 't_spk_tukang',
    name: 'SPK Tenaga Tukang',
    subject: 'SURAT PERINTAH KERJA (SPK) PEMELIHARAAN SARANA PRASARANA',
    category: 'Kerjasama',
    layout: 'centered',
    content: `SURAT PERINTAH KERJA (SPK)

Yang bertanda tangan di bawah ini:

Nama : [NAMA_KEPSEK]
NIP : [NIP_KEPSEK]
Jabatan : Kepala SDN Tempurejo 1
Alamat : [ALAMAT_SEKOLAH]

MEMBERIKAN PERINTAH KEPADA:

Nama : [NAMA_TUKANG]
NIK/KTP : [NIK_TUKANG]
Alamat : [ALAMAT_TUKANG]

Untuk melaksanakan pekerjaan pemeliharaan sarana dan prasarana sekolah dengan ketentuan sebagai berikut:

1. Jenis Pekerjaan : [JENIS_PERBAIKAN]
2. Lokasi Pekerjaan : SDN Tempurejo 1
3. Jangka Waktu : [DURASI_HARI] hari kerja (Mulai [MULAI] s/d [SELESAI])
4. Nilai Pekerjaan : Rp. [TOTAL_BIAYA]
5. Sistem Pembayaran : [SISTEM_BAYAR]

Pekerjaan harus dilaksanakan sesuai dengan standar kualitas dan spesifikasi yang telah disepakati. Seluruh hasil pekerjaan menjadi tanggung jawab PIHAK KEDUA sampai dengan serah terima dilakukan.

Demikian Surat Perintah Kerja ini dibuat untuk dilaksanakan dengan sebaik-baiknya.`
  },
  {
    id: 't_sptjm_uang_makan',
    name: 'SPTJM Uang Makan (PNS)',
    subject: 'SURAT PERNYATAAN TANGGUNG JAWAB MUTLAK',
    category: 'Dinas',
    layout: 'centered',
    content: `Yang bertanda tangan di bawah ini :

Nama : [NAMA_KEPSEK]
NIP : [NIP_KEPSEK]
Jabatan : Kepala SDN Tempurejo 1

Dengan ini menyatakan dengan sebenarnya bahwa :

1. Perhitungan yang terdapat pada Daftar Perhitungan uang makan bulan [BULAN] [TAHUN] SDN Tempurejo 1 telah dihitung dengan benar and berdasarkan daftar kerja Pegawai Negeri Sipil pada SDN Tempurejo 1.
2. Apabila dikemudian hari terdapat kelebihan atas pembayaran uang makan tersebut kami bersedia untuk menyetorkan kelebihan ke Kas Negara.

Demikian pernyataan ini kami buat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.`
  },
  {
    id: 't_spt',
    name: 'Surat Perintah Tugas (SPT)',
    subject: 'SURAT PERINTAH TUGAS',
    category: 'Tugas',
    layout: 'centered',
    content: `Dasar : [DASAR_SURAT]
Dasar : Program Kerja Sekolah Tahun Pelajaran 2024/2025.

MEMERINTAHKAN :

Kepada :
Nama : [NAMA_PETUGAS]
NIP : [NIP_PETUGAS]
Jabatan : [JABATAN_PETUGAS]

Untuk menghadiri kegiatan tersebut pada :
Tanggal : [TANGGAL_KEGIATAN]
Tempat : [TEMPAT_KEGIATAN]

Demikian surat perintah tugas ini dibuat untuk dilaksanakan dengan sebaik-baiknya dan penuh tanggung jawab.`
  },
  {
    id: 't_sppd',
    name: 'Surat Perintah Perjalanan Dinas (SPPD)',
    subject: 'SURAT PERINTAH PERJALANAN DINAS',
    category: 'Dinas',
    layout: 'centered',
    content: `1. Pejabat Pemberi Perintah : Kepala Sekolah
2. Nama Pegawai yang diperintah : [NAMA_PETUGAS]
3. a. Pangkat dan Golongan : [PANGKAT_GOL]
   b. Jabatan / Instansi : [JABATAN_PETUGAS]
   c. Tingkat Biaya Perjalanan : -
4. Maksud Perjalanan Dinas : [PERIHAL_TUGAS]
5. Alat angkut yang dipergunakan : Kendaraan Pribadi
6. a. Tempat Berangkat : SDN Tempurejo 1
   b. Tempat Tujuan : [TUJUAN]
7. a. Lamanya Perjalanan Dinas : 1 (Satu) Hari
   b. Tanggal Berangkat : [TANGGAL]
   c. Tanggal Kembali : [TANGGAL]
8. Pengikut : Nama
   1. -
9. Pembebanan Anggaran :
   a. Instansi : SDN Tempurejo 1
   b. Akun / Mata Anggaran : Dana BOS
10. Keterangan lain-lain : -`
  },
  {
    id: 't_laporan_sppd',
    name: 'Laporan Hasil SPPD',
    subject: 'LAPORAN HASIL PERJALANAN DINAS',
    category: 'Dinas',
    layout: 'centered',
    content: `Kepada Yth.
Kepala SDN Tempurejo 1
di Tempat

1. Dasar Pelaksanaan : [NOMOR_SPT]
2. Maksud / Tujuan : [MAKSUD_TUJUAN]
3. Waktu Pelaksanaan : [WAKTU]
4. Tempat Tujuan : [TEMPAT]

HASIL KEGIATAN :

[NARASI_LAPORAN_AI]

Demikian laporan perjalanan dinas ini kami sampaikan sebagai laporan pertanggungjawaban.`
  },
  {
    id: 't_notulen',
    name: 'Notulen Rapat (BOS)',
    subject: 'NOTULEN RAPAT',
    category: 'Dinas',
    layout: 'centered',
    content: `Hari / Tanggal : [HARI_TANGGAL]
Waktu : [WAKTU]
Tempat : [TEMPAT]
Acara : [ACARA]
Pemimpin Rapat : [PEMIMPIN]
Notulis : [NOTULIS]

HASIL RAPAT / PEMBAHASAN :

[NARASI_NOTULEN_AI]

Demikian notulen rapat ini dibuat sebagai bukti pelaksanaan kegiatan.`
  }
];

export const MOCK_INITIAL_DATA = [];

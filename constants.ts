
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
    id: 't_mou_ekskul',
    name: 'MOU Pengajar Ekskul',
    subject: 'PERJANJIAN KERJA SAMA TENAGA PENGAJAR EKSTRAKURIKULER',
    category: 'Kerjasama',
    layout: 'standard',
    content: `Yang bertanda tangan di bawah ini :

Nama : [NAMA_KEPSEK]
Jabatan : Kepala SDN Tempurejo 1
Pihak Pertama

Nama : [NAMA_PENGAJAR]
Alamat : [ALAMAT_PENGAJAR]
Pihak Kedua

Kedua belah pihak sepakat melakukan kerja sama pembinaan ekstrakurikuler [NAMA_EKSKUL] dengan ketentuan:
1. Pihak Kedua melaksanakan pembinaan sesuai jadwal yang ditetapkan.
2. Pihak Pertama memberikan honorarium sebesar Rp. [NOMINAL] per pertemuan.
3. Perjanjian ini berlaku sejak [TANGGAL_MULAI] sampai [TANGGAL_SELESAI].

Demikian perjanjian ini dibuat untuk ditaati.`
  },
  {
    id: 't_spk_tukang',
    name: 'SPK Tenaga Tukang',
    subject: 'SURAT PERJANJIAN KERJA (SPK) PEMELIHARAAN SARPRAS',
    category: 'Kerjasama',
    layout: 'standard',
    content: `Pada hari ini [HARI], Tanggal [TANGGAL_SEKARANG], telah disepakati kerja sama antara:

Jabatan : Kepala SDN Tempurejo 1 (Pihak Pertama)
Nama Pekerja : [NAMA_TUKANG] (Pihak Kedua)

Pihak Pertama memberikan tugas kepada Pihak Kedua untuk melaksanakan pekerjaan:
Pekerjaan : [JENIS_PERBAIKAN]
Lokasi : SDN Tempurejo 1

Ketentuan Pembayaran:
- Upah harian disepakati sebesar Rp. [UPAH_HARIAN].
- Pembayaran dilakukan setelah pekerjaan selesai/sesuai progres.
- Durasi pekerjaan diperkirakan selama [DURASI_HARI] hari.

Surat perintah kerja ini diberikan untuk dilaksanakan dengan penuh tanggung jawab.`
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

1. Perhitungan yang terdapat pada Daftar Perhitungan uang makan bulan [BULAN] [TAHUN] SDN Tempurejo 1 telah dihitung dengan benar dan berdasarkan daftar kerja Pegawai Negeri Sipil pada SDN Tempurejo 1.
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

Nama tersebut akan di beri tugas untuk menghadiri undangan tersebut pada :
tanggal : [TANGGAL_KEGIATAN]
Tempat : [TEMPAT_KEGIATAN]

Berikut surat tugas ini dibuat untuk dilaksanakan dengan sebaik-baiknya.`
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
Pangkat dan Golongan : [PANGKAT_GOL]
Jabatan : [JABATAN_PETUGAS]
Maksud Perjalanan Dinas : [PERIHAL_TUGAS]
Alat Angkut yang dipergunakan : Kendaraan Pribadi
Tempat Berangkat : SDN Tempurejo 1
Tempat Tujuan : [TUJUAN]
Lamanya Perjalanan Dinas : 1 (Satu) Hari
Tanggal Berangkat : [TANGGAL]
Tanggal Kembali : [TANGGAL]
Dasar Perintah : SPT Nomor [NOMOR_SPT] Tanggal [TANGGAL_SPT]
Instansi / Akun : Dana BOS / Sekolah
Keterangan Lain-lain : -`
  },
  {
    id: 't_laporan_sppd',
    name: 'Laporan Hasil SPPD',
    subject: 'LAPORAN HASIL PERJALANAN DINAS',
    category: 'Dinas',
    layout: 'standard',
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
    layout: 'standard',
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

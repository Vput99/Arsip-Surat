
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
    id: 't_sptjm_uang_makan',
    name: 'SPTJM Uang Makan (PNS)',
    subject: 'SURAT PERNYATAAN TANGGUNG JAWAB MUTLAK',
    category: 'Dinas',
    layout: 'centered',
    content: `Yang bertanda tangan di bawah ini :

Nama : [NAMA_KEPSEK]
NIP : [NIP_KEPSEK]
Jabatan : Kepala SDN [NAMA_SEKOLAH]

Dengan ini menyatakan dengan sebenarnya bahwa :

1. Perhitungan yang terdapat pada Daftar Perhitungan uang makan bulan [BULAN] [TAHUN] SDN [NAMA_SEKOLAH] telah dihitung dengan benar dan berdasarkan daftar hadir kerja Pegawai Negeri Sipil pada SDN [NAMA_SEKOLAH].
2. Apabila dikemudian hari terdapat kelebihan atas pembayaran uang makan tersebut kami bersedia untuk menyetorkan kelebihan tersebut ke Kas Negara.

Demikian pernyataan ini kami buat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.`
  },
  {
    id: 't_notulen',
    name: 'Notulen Rapat',
    subject: 'NOTULEN RAPAT',
    category: 'Dinas',
    layout: 'standard',
    content: `Hari / Tanggal : [HARI_TANGGAL]
Waktu : [WAKTU]
Tempat : [TEMPAT_RAPAT]
Acara : [ACARA_RAPAT]
Pemimpin Rapat : [PEMIMPIN_RAPAT]
Notulis : [NAMA_NOTULIS]

HASIL RAPAT / PEMBAHASAN :

1. Pembukaan oleh pemimpin rapat.
2. Pembahasan mengenai : [ISI_PEMBAHASAN]
3. Masukan dan saran : [MASUKAN_SARAN]
4. Kesimpulan rapat : [KESIMPULAN]

Demikian notulen rapat ini dibuat sebagai laporan pertanggungjawaban kegiatan.`
  },
  {
    id: 't_laporan_sppd',
    name: 'Laporan SPPD',
    subject: 'LAPORAN HASIL PERJALANAN DINAS',
    category: 'Dinas',
    layout: 'standard',
    content: `Kepada Yth.
Kepala SDN [NAMA_SEKOLAH]
di Tempat

1. Dasar Pelaksanaan : Surat Perintah Tugas (SPT) Nomor [NOMOR_SPT] Tanggal [TANGGAL_SPT].
2. Maksud / Tujuan : Dalam rangka [TUJUAN_KEGIATAN].
3. Waktu Pelaksanaan : Tanggal [WAKTU_PELAKSANAAN].
4. Tempat Tujuan : [LOKASI_TUJUAN].

HASIL KEGIATAN :

[URAIAN_KEGIATAN_SECARA_RINGKAS]

Demikian laporan perjalanan dinas ini kami sampaikan sebagai laporan pertanggungjawaban dan bahan pemeriksaan lebih lanjut.`
  },
  {
    id: 't_spt',
    name: 'Surat Perintah Tugas (SPT)',
    subject: 'SURAT PERINTAH TUGAS',
    category: 'Tugas',
    layout: 'centered',
    content: `Dasar : Surat dari [PENGIRIM] Nomor : [NOMOR_SURAT] tentang [PERIHAL].
Dasar : Program Kerja Sekolah Tahun Pelajaran 2024/2025.

MEMERINTAHKAN :

Kepada :
Nama : [NAMA_PETUGAS]
NIP : [NIP_PETUGAS]
Jabatan : [JABATAN_PETUGAS]

Nama tersebut akan di beri tugas untuk menghadiri undangan tersebut pada :
tanggal : [TANGGAL]
Tempat : [TEMPAT]

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
Tempat Berangkat : SDN [NAMA_SEKOLAH]
Tempat Tujuan : [TUJUAN]
Lamanya Perjalanan Dinas : 1 (Satu) Hari
Tanggal Berangkat : [TANGGAL]
Tanggal Kembali : [TANGGAL]
Dasar Perintah : SPT Nomor [NOMOR_SPT] Tanggal [TANGGAL_SPT]
Instansi / Akun : Dana BOS / Sekolah
Keterangan Lain-lain : -`
  },
  {
    id: 't_undangan_wali',
    name: 'Undangan Wali Murid',
    subject: 'UNDANGAN PERTEMUAN WALI MURID',
    category: 'Undangan',
    layout: 'standard',
    content: `Kepada Yth.
Bapak/Ibu Orang Tua / Wali Murid
Kelas [KELAS] SDN [NAMA_SEKOLAH]
di Tempat

Dengan hormat,

Sehubungan dengan akan dilaksanakannya kegiatan [NAMA_KEGIATAN], maka kami mengharap kehadiran Bapak/Ibu pada:

Hari / Tanggal : ...................................................
Waktu : ...................................................
Tempat : Aula SDN [NAMA_SEKOLAH]
Acara : ...................................................

Mengingat pentingnya acara tersebut, kami mohon kehadiran Bapak/Ibu tepat pada waktunya. Atas perhatiannya kami ucapkan terima kasih.`
  },
  {
    id: 't_mutasi',
    name: 'Surat Keterangan Pindah (Mutasi)',
    subject: 'SURAT KETERANGAN PINDAH SEKOLAH',
    category: 'Mutasi',
    layout: 'centered',
    content: `Kepala Sekolah Dasar Negeri [NAMA_SEKOLAH] menerangkan bahwa :

Nama : ...................................................
NIS / NISN : ...................................................
Jenis Kelamin : ...................................................
Kelas : ...................................................

Telah mengajukan pindah sekolah ke :
Nama Sekolah Tujuan : ...................................................
Alamat Sekolah : ...................................................
Alasan Pindah : Ikut Orang Tua

Bersama ini kami lampirkan dokumen pendukung mutasi siswa. Demikian surat keterangan ini dibuat untuk dipergunakan sebagaimana mestinya.`
  },
  {
    id: 't_pemberitahuan_libur',
    name: 'Pemberitahuan Libur Sekolah',
    subject: 'PEMBERITAHUAN LIBUR SEKOLAH',
    category: 'Pemberitahuan',
    layout: 'standard',
    content: `Kepada Yth.
Bapak/Ibu Orang Tua / Wali Murid
SDN [NAMA_SEKOLAH]
di Tempat

Dengan hormat,

Berdasarkan Kalender Pendidikan dan Surat Edaran Dinas Pendidikan tentang [DASAR_LIBUR], maka dengan ini kami beritahukan bahwa:

Kegiatan Belajar Mengajar (KBM) diliburkan mulai tanggal [TGL_MULAI] s.d [TGL_SELESAI]. Siswa masuk kembali pada tanggal [TGL_MASUK].

Selama masa libur, kami menghimbau agar orang tua tetap mengawasi belajar siswa di rumah. Demikian pemberitahuan ini, atas perhatiannya kami ucapkan terima kasih.`
  }
];

export const MOCK_INITIAL_DATA = [];

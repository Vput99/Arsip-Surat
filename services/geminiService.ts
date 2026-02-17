
// Inisialisasi AI dengan API Key dari environment
import { GoogleGenAI, Type } from "@google/genai";
import { AIAnalysisResult, UrgencyLevel, Mail } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Analisis Surat Masuk
 */
export const analyzeLetter = async (text: string, imageData?: string): Promise<AIAnalysisResult | null> => {
  try {
    const parts: any[] = [{
      text: `Bertindaklah sebagai staf administrasi sekolah. Ekstrak data dari dokumen ini:
      1. referenceNumber (Nomor Surat)
      2. sender (Pengirim)
      3. subject (Perihal)
      4. date (Tanggal Surat format YYYY-MM-DD)
      5. summary (Ringkasan singkat)
      6. category (Undangan, Dinas, Pemberitahuan, Permohonan, dll)
      7. urgency (Biasa, Penting, Segera)
      Input: "${text}"`
    }];

    if (imageData?.startsWith('data:image')) {
      const base64Data = imageData.split(',')[1];
      const mimeType = imageData.split(';')[0].split(':')[1];
      parts.push({ inlineData: { data: base64Data, mimeType } });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            category: { type: Type.STRING },
            urgency: { type: Type.STRING },
            sentiment: { type: Type.STRING },
            referenceNumber: { type: Type.STRING },
            sender: { type: Type.STRING },
            subject: { type: Type.STRING },
            date: { type: Type.STRING }
          },
          required: ["summary", "category", "urgency", "referenceNumber", "sender", "subject", "date"]
        }
      }
    });

    return JSON.parse(response.text || "{}") as AIAnalysisResult;
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return null;
  }
};

/**
 * Analisis Payroll/Honorarium
 */
export const analyzePayroll = async (data: any): Promise<string> => {
  try {
    const prompt = `Analisis data pembayaran honor sekolah berikut dan buatkan ringkasan eksekutif profesional untuk laporan BOS:
    Kategori: ${data.category}
    Bulan: ${data.period}
    Data: ${JSON.stringify(data.staff)}
    
    Berikan:
    1. Total Bruto, Pajak PPh21, dan Total Netto.
    2. Ringkasan jumlah kehadiran tertinggi dan terendah.
    3. Narasi singkat untuk dasar pencairan dana BOS.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { parts: [{ text: prompt }] }
    });
    
    return response.text || "Gagal melakukan analisis.";
  } catch (e) {
    return "Analisis AI tidak tersedia saat ini.";
  }
};

/**
 * Pembuatan SPT - Perbaikan duplikasi "Dasar" dan Judul, serta penambahan penutup
 */
export const generateSPTFromInvitation = async (invitation: Mail): Promise<string> => {
  try {
    const prompt = `Buatkan naskah SURAT PERINTAH TUGAS (SPT) berdasarkan data surat masuk berikut:
    Dari: ${invitation.sender}
    Nomor: ${invitation.referenceNumber}
    Perihal: ${invitation.subject}
    Deskripsi: ${invitation.description}
    
    ATURAN PENTING:
    1. JANGAN sertakan Judul Surat (seperti "SURAT PERINTAH TUGAS") karena sudah ada di sistem.
    2. JANGAN sertakan KOP Sekolah atau bagian Tanda Tangan.
    3. Mulai langsung dari naskah 'Dasar :'.
    4. Gunakan placeholder [NAMA_PETUGAS], [NIP_PETUGAS], dan [JABATAN_PETUGAS].
    5. AKHIRI naskah dengan kalimat penutup: "Demikian surat perintah tugas ini dibuat untuk dilaksanakan dengan sebaik-baiknya dan penuh tanggung jawab."
    
    Format Naskah:
    Dasar: Surat dari ${invitation.sender} Nomor ${invitation.referenceNumber} Tanggal ${invitation.date} perihal ${invitation.subject}.
    Dasar: Program Kerja Sekolah Tahun Pelajaran 2024/2025.

    MEMERINTAHKAN :
    Kepada :
    Nama : [NAMA_PETUGAS]
    NIP : [NIP_PETUGAS]
    Jabatan : [JABATAN_PETUGAS]

    Untuk menghadiri kegiatan tersebut pada :
    Tanggal : [Ekstrak tanggal kegiatan saja dari konteks]
    Tempat : [Ekstrak tempat kegiatan saja dari konteks]

    Demikian surat perintah tugas ini dibuat untuk dilaksanakan dengan sebaik-baiknya dan penuh tanggung jawab.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { parts: [{ text: prompt }] }
    });
    
    return response.text || "Gagal menghasilkan teks.";
  } catch (e) {
    console.error("SPT Gen Error:", e);
    return "Gagal generate SPT secara otomatis. Silakan isi manual.";
  }
};

/**
 * Pembuatan SPPD - Mengotomatisasi durasi hari berdasarkan analisis tanggal di SPT
 */
export const generateSPPDFromSPT = async (spt: Mail): Promise<string> => {
  try {
    const prompt = `Bertindaklah sebagai staf administrasi sekolah yang sangat teliti. 
    Buatkan naskah SPPD berdasarkan data SPT berikut:
    Subjek SPT: ${spt.subject}
    Detail Tugas: ${spt.description}
    Nomor SPT: ${spt.referenceNumber}
    
    TUGAS UTAMA:
    1. Analisis deskripsi di atas untuk mencari rentang tanggal kegiatan.
    2. Hitung jumlah hari (DURASI). 
       - Jika tertulis hanya satu tanggal (misal: "23 Februari"), maka durasi = 1 (Satu) Hari.
       - Jika tertulis rentang (misal: "28 Februari - 1 Maret"), hitung selisih harinya termasuk hari berangkat (dalam contoh ini durasi = 2 (Dua) Hari).
    
    FORMAT OUTPUT (WAJIB 1-10):
    1. Pejabat Pemberi Perintah : Kepala Sekolah
    2. Nama Pegawai yang diperintah : [NAMA_PETUGAS]
    3. a. Pangkat dan Golongan : [PANGKAT_GOL]
       b. Jabatan / Instansi : [JABATAN_PETUGAS]
       c. Tingkat Biaya Perjalanan : -
    4. Maksud Perjalanan Dinas : ${spt.subject}
    5. Alat angkut yang dipergunakan : Kendaraan Pribadi
    6. a. Tempat Berangkat : SDN Tempurejo 1
       b. Tempat Tujuan : [Ekstrak tujuan dari deskripsi]
    7. a. Lamanya Perjalanan Dinas : [X] ([Terbilang]) Hari
       b. Tanggal Berangkat : [Ekstrak tanggal awal]
       c. Tanggal Kembali : [Ekstrak tanggal akhir]
    8. Pengikut : Nama
       1. -
    9. Pembebanan Anggaran :
       a. Instansi : SDN Tempurejo 1
       b. Akun / Mata Anggaran : Dana BOS
    10. Keterangan lain-lain : -

    Hanya berikan isi poin 1 sampai 10 tersebut. Jangan sertakan judul surat atau kop sekolah.`;
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { parts: [{ text: prompt }] }
    });
    return response.text || "Gagal menghasilkan teks.";
  } catch (e) {
    return "Gagal generate SPPD secara otomatis.";
  }
};

/**
 * Pembuatan Laporan/Notulen - Fokus pada body saja
 */
export const generateLaporanDanNotulen = async (mailContext: Mail, type: 'LAPORAN' | 'NOTULEN'): Promise<string> => {
  try {
    const prompt = type === 'LAPORAN' 
      ? `Buatkan naskah LAPORAN HASIL PERJALANAN DINAS (Hanya isinya saja). Perihal: "${mailContext.subject}". Deskripsi awal: "${mailContext.description}". Tulis 3 paragraf tanpa judul.`
      : `Buatkan naskah NOTULEN RAPAT (Hanya isinya saja). Perihal: "${mailContext.subject}". Pembahasan: "${mailContext.description}". Tulis dalam poin-poin tanpa judul.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { parts: [{ text: prompt }] }
    });
    return response.text || "Gagal menghasilkan teks.";
  } catch (e) {
    return `Gagal generate ${type}.`;
  }
};

/**
 * Magic Fill untuk Editor
 */
export const generateNotulenContent = async (context: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { parts: [{ text: `Rapikan catatan rapat berikut menjadi naskah notulen resmi Dana BOS (Hanya berikan isinya saja, tanpa judul): "${context}"` }] }
    });
    return response.text || "";
  } catch (e) { return "Gagal merapikan notulen."; }
};

export const generateLaporanSPPDContent = async (context: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { parts: [{ text: `Buat narasi laporan perjalanan dinas dari poin-poin ini (Hanya berikan isinya saja, tanpa judul): "${context}"` }] }
    });
    return response.text || "";
  } catch (e) { return "Gagal merapikan laporan."; }
};


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
 * Pembuatan SPT - Perbaikan duplikasi "Dasar" dan Judul
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
    4. Gunakan placeholder [NAMA_PETUGAS], [NIP_PETUGAS], dan [JABATAN_PETUGAS] agar bisa diedit user.
    
    Format Naskah:
    Dasar: Surat dari ${invitation.sender} Nomor ${invitation.referenceNumber} Tanggal ${invitation.date} perihal ${invitation.subject}.
    Dasar: Program Kerja Sekolah Tahun Pelajaran 2024/2025.

    MEMERINTAHKAN :
    Kepada :
    Nama : [NAMA_PETUGAS]
    NIP : [NIP_PETUGAS]
    Jabatan : [JABATAN_PETUGAS]

    Untuk menghadiri kegiatan tersebut pada :
    Tanggal : [Ekstrak tanggal kegiatan saja]
    Tempat : [Ekstrak tempat kegiatan saja]`;

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
 * Pembuatan SPPD - Fokus pada body saja
 */
export const generateSPPDFromSPT = async (spt: Mail): Promise<string> => {
  try {
    const prompt = `Berdasarkan SPT Nomor ${spt.referenceNumber} perihal "${spt.subject}", buatkan naskah SPPD. 
    Detail: "${spt.description}"
    Hanya berikan isi poin-poin naskah SPPD saja, jangan sertakan Judul Surat atau Nama Sekolah. 
    Pastikan menggunakan label titik dua yang rapi.`;
    
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

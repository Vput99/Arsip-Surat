
// Inisialisasi AI dengan API Key dari environment
import { GoogleGenAI, Type } from "@google/genai";
import { AIAnalysisResult, UrgencyLevel, Mail } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Analisis Surat Masuk (Gunakan Flash untuk ekstraksi data yang cepat dan akurat)
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
 * Pembuatan SPT (Gunakan Flash untuk kecepatan dan stabilitas)
 */
export const generateSPTFromInvitation = async (invitation: Mail): Promise<string> => {
  try {
    const prompt = `Buatkan naskah SURAT PERINTAH TUGAS (SPT) berdasarkan data berikut:
    Pengirim: ${invitation.sender}
    Nomor Surat Masuk: ${invitation.referenceNumber}
    Perihal: ${invitation.subject}
    Isi: ${invitation.description}
    
    Buat draf resmi dengan format:
    Dasar : Surat dari [PENGIRIM] Nomor [NOMOR] Tanggal [TANGGAL] perihal [PERIHAL].
    Dasar : Program Kerja Sekolah Tahun Pelajaran 2024/2025.

    MEMERINTAHKAN :
    Kepada :
    Nama : [NAMA_PETUGAS]
    NIP : [NIP_PETUGAS]
    Jabatan : [JABATAN_PETUGAS]

    Untuk menghadiri kegiatan tersebut pada :
    Tanggal : [Ekstrak tanggal dari isi surat]
    Tempat : [Ekstrak tempat dari isi surat]`;

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
 * Pembuatan SPPD
 */
export const generateSPPDFromSPT = async (spt: Mail): Promise<string> => {
  try {
    const prompt = `Berdasarkan SPT Nomor ${spt.referenceNumber} perihal "${spt.subject}", buatkan naskah SPPD resmi. 
    Detail: "${spt.description}"
    Format harus rapi menggunakan label titik dua.`;
    
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
 * Pembuatan Laporan/Notulen
 */
export const generateLaporanDanNotulen = async (mailContext: Mail, type: 'LAPORAN' | 'NOTULEN'): Promise<string> => {
  try {
    const prompt = type === 'LAPORAN' 
      ? `Buatkan narasi LAPORAN HASIL PERJALANAN DINAS yang formal. Perihal: "${mailContext.subject}". Deskripsi awal: "${mailContext.description}". Tulis 3 paragraf.`
      : `Buatkan naskah NOTULEN RAPAT. Perihal: "${mailContext.subject}". Pembahasan: "${mailContext.description}". Tulis dalam poin-poin profesional.`;

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
      contents: { parts: [{ text: `Rapikan catatan rapat berikut menjadi notulen resmi Dana BOS: "${context}"` }] }
    });
    return response.text || "";
  } catch (e) { return "Gagal merapikan notulen."; }
};

export const generateLaporanSPPDContent = async (context: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { parts: [{ text: `Buat narasi laporan perjalanan dinas dari poin-poin ini: "${context}"` }] }
    });
    return response.text || "";
  } catch (e) { return "Gagal merapikan laporan."; }
};

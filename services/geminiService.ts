
import { GoogleGenAI, Type } from "@google/genai";
import { AIAnalysisResult, UrgencyLevel, Mail } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Fungsi utama analisis surat masuk
export const analyzeLetter = async (text: string, imageData?: string): Promise<AIAnalysisResult | null> => {
  try {
    const parts: any[] = [{
      text: `Bertindaklah sebagai staf administrasi sekolah. Ekstrak data dari dokumen ini:
      1. referenceNumber (Nomor Surat)
      2. sender (Pengirim)
      3. subject (Perihal)
      4. date (Tanggal Surat YYYY-MM-DD)
      5. summary (Ringkasan singkat)
      6. category (Undangan, Dinas, dll)
      7. urgency (Biasa, Penting, Segera)
      Input: "${text}"`
    }];

    if (imageData?.startsWith('data:image')) {
      const base64Data = imageData.split(',')[1];
      const mimeType = imageData.split(';')[0].split(':')[1];
      parts.push({ inlineData: { data: base64Data, mimeType } });
    }

    const response = await ai.models.generateContent({
      // Complex text task: using gemini-3-pro-preview
      model: "gemini-3-pro-preview",
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            category: { type: Type.STRING },
            urgency: { type: Type.STRING, enum: [UrgencyLevel.LOW, UrgencyLevel.MEDIUM, UrgencyLevel.HIGH] },
            sentiment: { type: Type.STRING },
            referenceNumber: { type: Type.STRING },
            sender: { type: Type.STRING },
            subject: { type: Type.STRING },
            date: { type: Type.STRING }
          },
          required: ["summary", "category", "urgency", "sentiment", "referenceNumber", "sender", "subject", "date"]
        }
      }
    });

    return JSON.parse(response.text || "{}") as AIAnalysisResult;
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return null;
  }
};

// CHAIN 1: Surat Masuk -> SPT
export const generateSPTFromInvitation = async (invitation: Mail): Promise<string> => {
  try {
    const prompt = `Buatkan naskah SURAT PERINTAH TUGAS (SPT) berdasarkan Surat Masuk dari ${invitation.sender} dengan perihal "${invitation.subject}".
    Isi Surat Masuk: "${invitation.description}"
    
    Ekstrak tanggal dan tempat kegiatan dari isi tersebut. 
    FORMAT OUTPUT:
    Dasar : Surat dari ${invitation.sender} Nomor : ${invitation.referenceNumber} Tanggal ${invitation.date} perihal ${invitation.subject}.
    Dasar : Program Kerja Sekolah Tahun Pelajaran 2024/2025.

    MEMERINTAHKAN :
    Kepada :
    Nama : [NAMA_PETUGAS]
    NIP : [NIP_PETUGAS]
    Jabatan : [JABATAN_PETUGAS]

    Nama tersebut akan di beri tugas untuk menghadiri kegiatan tersebut pada :
    tanggal : [Hasil Ekstraksi Tanggal]
    Tempat : [Hasil Ekstraksi Tempat]

    Berikut surat tugas ini dibuat untuk dilaksanakan dengan sebaik-baiknya.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt
    });
    return response.text || "";
  } catch (e) { return "Gagal generate SPT."; }
};

// CHAIN 2: SPT -> SPPD
export const generateSPPDFromSPT = async (spt: Mail): Promise<string> => {
  try {
    const prompt = `Berdasarkan SPT Nomor ${spt.referenceNumber} perihal "${spt.subject}", buatkan naskah SPPD resmi. 
    Isi SPT: "${spt.description}"
    
    Tampilkan data dalam format label titik dua yang rapi. Sertakan detail perjalanan dari SDN Tempurejo 1 ke lokasi tujuan yang disebutkan di SPT.`;
    
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt
    });
    return response.text || "";
  } catch (e) { return "Gagal generate SPPD."; }
};

// CHAIN 3: SPT/SPPD -> LAPORAN & NOTULEN
export const generateLaporanDanNotulen = async (mailContext: Mail, type: 'LAPORAN' | 'NOTULEN'): Promise<string> => {
  try {
    const prompt = type === 'LAPORAN' 
      ? `Buatkan narasi LAPORAN HASIL PERJALANAN DINAS yang profesional dan formal untuk tugas: "${mailContext.subject}". Konteks: "${mailContext.description}". Tulis dalam 3-4 paragraf yang menjelaskan urutan kegiatan dan kesimpulan.`
      : `Buatkan naskah NOTULEN RAPAT berdasarkan kegiatan: "${mailContext.subject}". Konteks: "${mailContext.description}". Tulis poin-poin pembahasan rapat yang sinkron dengan perihal tersebut agar sah sebagai bukti Dana BOS.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt
    });
    return response.text || "";
  } catch (e) { return `Gagal generate ${type}.`; }
};

// Fungsi khusus untuk Magic Fill di LetterCreator (Input: string)
export const generateNotulenContent = async (context: string): Promise<string> => {
  try {
    const prompt = `Rapikan poin-poin berikut menjadi naskah NOTULEN RAPAT yang formal dan sinkron untuk pelaporan Dana BOS. 
    Konteks: "${context}"
    Tuliskan isi pembahasan rapat dalam poin-poin yang jelas dan profesional.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt
    });
    return response.text || "";
  } catch (e) { return "Gagal generate notulen."; }
};

// Fungsi khusus untuk Magic Fill di LetterCreator (Input: string)
export const generateLaporanSPPDContent = async (context: string): Promise<string> => {
  try {
    const prompt = `Buatkan narasi LAPORAN HASIL PERJALANAN DINAS yang profesional dan formal berdasarkan poin-poin berikut: "${context}". 
    Tulis dalam 3-4 paragraf yang menjelaskan urutan kegiatan dan kesimpulan.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt
    });
    return response.text || "";
  } catch (e) { return "Gagal generate laporan."; }
};

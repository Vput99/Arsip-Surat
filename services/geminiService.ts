
import { GoogleGenAI, Type } from "@google/genai";
import { AIAnalysisResult, UrgencyLevel } from "../types";

export const analyzeLetter = async (text: string, imageData?: string): Promise<AIAnalysisResult | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const parts: any[] = [
      {
        text: `Bertindaklah sebagai staf administrasi sekolah yang ahli. Ekstrak data dari dokumen surat berikut ini.
        Data yang harus diekstrak:
        1. referenceNumber: Cari nomor surat (contoh: 421.2/123/2024).
        2. sender: Nama lembaga, dinas, atau instansi pengirim surat.
        3. subject: Perihal atau judul surat.
        4. date: Tanggal surat tersebut diterbitkan/dibuat (Format: YYYY-MM-DD). Jika tidak ditemukan, kosongkan.
        5. summary: Ringkasan singkat isi surat (maksimal 2 kalimat).
        6. category: Tentukan kategori (Undangan, Dinas, Pemberitahuan, Permohonan, Keputusan, atau Tugas).
        7. urgency: Tingkat kepentingan (Biasa, Penting, atau Segera).
        8. sentiment: Nada surat.

        Input Teks: "${text}"`
      }
    ];

    if (imageData && imageData.startsWith('data:image')) {
      const base64Data = imageData.split(',')[1];
      const mimeType = imageData.split(';')[0].split(':')[1];
      parts.push({
        inlineData: {
          data: base64Data,
          mimeType: mimeType
        }
      });
    }

    const response = await ai.models.generateContent({
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
            referenceNumber: { type: Type.STRING, description: "Nomor resmi surat" },
            sender: { type: Type.STRING, description: "Instansi pengirim" },
            subject: { type: Type.STRING, description: "Perihal surat" },
            date: { type: Type.STRING, description: "Tanggal surat diterbitkan (YYYY-MM-DD)" }
          },
          required: ["summary", "category", "urgency", "sentiment", "referenceNumber", "sender", "subject", "date"]
        }
      }
    });

    const result = JSON.parse(response.text || "{}");
    return result as AIAnalysisResult;

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return null;
  }
};

export const generateSPTContent = async (invitationMail: any): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    // Prompt yang sangat spesifik untuk mengambil Nomor Surat Masuk sebagai Dasar
    const prompt = `Anda adalah sekretaris sekolah. Buatkan naskah Surat Perintah Tugas (SPT) berdasarkan data Surat Masuk berikut.
    
    DATA SURAT MASUK (SUMBER):
    - Nomor Surat: ${invitationMail.referenceNumber}
    - Pengirim: ${invitationMail.sender}
    - Perihal: ${invitationMail.subject}
    - Isi Ringkas: ${invitationMail.description}
    - Ringkasan AI: ${invitationMail.aiSummary || '-'}
    
    INSTRUKSI KHUSUS:
    1. Bagian 'Dasar' WAJIB menyebutkan "Surat Undangan dari [Pengirim] Nomor [Nomor Surat] tanggal [Tanggal Surat]".
    2. Bagian 'Untuk' WAJIB mendeteksi nama kegiatan, hari/tanggal pelaksanaan, dan tempat dari isi surat.
    3. Format harus rapi menggunakan Key : Value.
    
    CONTOH FORMAT OUTPUT (Ikuti persis struktur ini):
    Dasar : Surat ${invitationMail.category || 'Undangan'} dari ${invitationMail.sender} Nomor : ${invitationMail.referenceNumber}.
    Dasar : Program Kerja Sekolah Tahun Pelajaran 2024/2025.

    MEMERINTAHKAN :

    Kepada :
    Nama : [NAMA_PETUGAS]
    NIP : [NIP_PETUGAS]
    Jabatan : [JABATAN_PETUGAS]

    Untuk : 1. Menghadiri kegiatan ${invitationMail.subject} yang akan dilaksanakan pada ... (lengkapi tanggal/waktu/tempat dari isi surat).
    Untuk : 2. Melaporkan hasil pelaksanaan tugas kepada Kepala Sekolah.

    Demikian surat tugas ini dibuat untuk dilaksanakan dengan penuh tanggung jawab.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt
    });

    let text = response.text || "";
    // Bersihkan markdown atau prefix yang tidak perlu
    text = text.replace(/^(Berikut|Ini|Naskah|Draft).*:(\n)?/i, '')
               .replace(/\*\*/g, '')
               .replace(/```/g, '')
               .trim();
               
    return text;
  } catch (error) {
    console.error("Gemini SPT Error:", error);
    // Fallback manual jika AI gagal
    return `Dasar : Surat dari ${invitationMail.sender} Nomor : ${invitationMail.referenceNumber}.\nDasar : Program Kerja Sekolah Tahun Pelajaran 2024/2025.\n\nMEMERINTAHKAN :\n\nKepada :\nNama : [NAMA_PETUGAS]\nNIP : [NIP_PETUGAS]\n\nUntuk : 1. Menghadiri kegiatan ${invitationMail.subject}.\nUntuk : 2. Melaporkan hasil pelaksanaan tugas.`;
  }
};

export const suggestReply = async (incomingMailText: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: `Buatkan draf surat balasan resmi untuk sekolah dasar berdasarkan surat masuk berikut. Gunakan bahasa Indonesia yang sopan dan format surat dinas yang benar.
      
      Surat Masuk:
      "${incomingMailText}"`
    });
    return response.text || "Tidak ada respons dari AI.";
  } catch (error) {
    console.error("Gemini Reply Error:", error);
    return "Terjadi kesalahan saat membuat balasan.";
  }
};

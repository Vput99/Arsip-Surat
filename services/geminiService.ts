
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

    // Upgrade to gemini-3-pro-preview for complex information extraction and structured data reasoning.
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
    const prompt = `Buatkan isi naskah Surat Perintah Tugas (SPT) sekolah yang sangat formal berdasarkan undangan berikut.
    DATA SURAT MASUK:
    Nomor Surat: ${invitationMail.referenceNumber}
    Pengirim: ${invitationMail.sender}
    Perihal: ${invitationMail.subject}
    Isi: ${invitationMail.description}
    
    ATURAN FORMAT (WAJIB IKUTI PERSIS):
    1. JANGAN gunakan markdown (**bold** dll).
    2. JANGAN sertakan kalimat pembuka seperti "Berikut draf surat...". Langsung mulai dari konten.
    3. Gunakan format baris baru dan titik dua ( : ) agar rapi.
    
    STRUKTUR NASKAH (Gunakan Tepat Seperti Ini):
    Dasar : Surat dari ${invitationMail.sender} Nomor : ${invitationMail.referenceNumber}
    Dasar : Program Kerja Sekolah Tahun Pelajaran 2024/2025.

    MEMERINTAHKAN :

    Kepada :
    Nama : [NAMA_PETUGAS]
    NIP : [NIP_PETUGAS]
    Jabatan : [JABATAN_PETUGAS]

    Untuk : 1. Menghadiri ${invitationMail.subject} pada tanggal ... (sesuaikan dari isi).
    Untuk : 2. Melaporkan hasil pelaksanaan tugas kepada Kepala Sekolah.

    Demikian surat tugas ini dibuat untuk dilaksanakan dengan penuh tanggung jawab.`;

    // Upgrade to gemini-3-pro-preview for formal legal document generation based on complex reasoning rules.
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt
    });

    // Menghilangkan redundansi jika AI still provides prefixes
    let text = response.text || "";
    text = text.replace(/^(Berikut adalah|Ini adalah|Sesuai dengan|Tentu, ini|Berikut ini|Berikut draf).*(:|surat|naskah|berikut):?/i, '');
    return text.replace(/\*\*/g, '').trim();
  } catch (error) {
    console.error("Gemini SPT Error:", error);
    return "Dasar : Surat Undangan.\n\nMEMERINTAHKAN :\n\nKepada :\nNama : [NAMA_PETUGAS]\nNIP : [NIP_PETUGAS]\n\nUntuk : Menghadiri kegiatan dinas.";
  }
};

export const suggestReply = async (incomingMailText: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    // Upgrade to gemini-3-pro-preview for drafting professional and formal responses.
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

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
      model: "gemini-3-flash-preview",
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
    const prompt = `Buatkan isi naskah Surat Perintah Tugas (SPT) sekolah.
    DATA SURAT REFERENSI:
    Nomor Surat: ${invitationMail.referenceNumber}
    Pengirim: ${invitationMail.sender}
    Perihal: ${invitationMail.subject}
    Isi: ${invitationMail.description}
    
    ATURAN OUTPUT (WAJIB):
    1. JANGAN sertakan Judul "SURAT PERINTAH TUGAS" atau "Nomor: ...".
    2. JANGAN gunakan tanda bintang (**) atau simbol markdown apapun.
    3. Mulai langsung dari kata "Dasar :".
    4. Bagian Dasar harus menyebutkan: Surat dari ${invitationMail.sender} Nomor ${invitationMail.referenceNumber} perihal ${invitationMail.subject}.
    5. Tambahkan poin Dasar kedua: Program Kerja dan Anggaran Sekolah Tahun 2024/2025.
    6. Gunakan format "MEMERINTAHKAN :" diikuti "Kepada :", lalu "Nama : [NAMA_PETUGAS]", "NIP : [NIP_PETUGAS]", "Jabatan : [JABATAN_PETUGAS]".
    7. Bagian "Untuk :" harus merinci kegiatan berdasarkan isi surat referensi.
    8. Gunakan placeholder [NAMA_PETUGAS] agar bisa diganti otomatis nanti.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt
    });

    // Menghapus baris kosong berlebih dan tanda bintang jika masih ada
    return (response.text || "").replace(/\*\*/g, '').trim();
  } catch (error) {
    console.error("Gemini SPT Error:", error);
    return "Gagal menyusun naskah SPT otomatis.";
  }
};

export const suggestReply = async (incomingMailText: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
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
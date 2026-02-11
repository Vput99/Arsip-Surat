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
    const prompt = `Buatkan isi naskah Surat Perintah Tugas (SPT) sekolah yang sangat formal.
    DATA SURAT REFERENSI:
    Nomor Surat: ${invitationMail.referenceNumber}
    Pengirim: ${invitationMail.sender}
    Perihal: ${invitationMail.subject}
    Isi: ${invitationMail.description}
    
    ATURAN OUTPUT (WAJIB TAATI):
    1. JANGAN sertakan Judul "SURAT PERINTAH TUGAS" atau "Nomor: ...".
    2. JANGAN sertakan kalimat pembuka seperti "Berikut adalah...".
    3. JANGAN gunakan tanda bintang (**) atau markdown.
    4. MULAI LANGSUNG dari kata "Dasar :".
    5. Format Dasar (Wajib Satu Baris): "Dasar : Surat dari ${invitationMail.sender} Nomor : ${invitationMail.referenceNumber} Tentang ${invitationMail.subject}."
    6. Tambahkan poin Dasar kedua: "2. Program Kerja dan Anggaran Sekolah Tahun Pelajaran 2024/2025."
    7. Tulis "MEMERINTAHKAN :" di baris baru setelah Dasar.
    8. Tulis "Kepada :" di baris baru, diikuti list personil dengan placeholder [NAMA_PETUGAS], [NIP_PETUGAS], [JABATAN_PETUGAS].
    9. Format Untuk: "Untuk : 1. Menghadiri ${invitationMail.subject} yang diselenggarakan oleh ${invitationMail.sender} pada tanggal ... (ambil dari isi naskah)."
    10. Tambahkan poin Untuk kedua: "2. Melaporkan hasil pelaksanaan tugas kepada Kepala Sekolah."
    11. Gunakan spasi setelah tanda titik dua ( : ).`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt
    });

    // Menghilangkan redundansi jika AI masih keras kepala
    let text = response.text || "";
    text = text.replace(/^(Berikut adalah|Ini adalah|Sesuai dengan|Tentu, ini|Berikut ini).*(:|surat|naskah|berikut):/i, '');
    return text.replace(/\*\*/g, '').trim();
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
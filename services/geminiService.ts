
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
    const prompt = `Anda adalah sekretaris administrasi sekolah dasar yang sangat teliti. 
    Buatkan naskah SURAT PERINTAH TUGAS (SPT) berdasarkan data Surat Masuk berikut:
    
    DATA SURAT MASUK:
    - Nomor: ${invitationMail.referenceNumber}
    - Dari: ${invitationMail.sender}
    - Perihal: ${invitationMail.subject}
    - Isi: ${invitationMail.description}
    
    ATURAN FORMAT (WAJIB SAMA PERSIS DENGAN CONTOH DI BAWAH):
    
    Dasar : Surat dari ${invitationMail.sender} Nomor : ${invitationMail.referenceNumber} tentang ${invitationMail.subject} pada satuan pendidikan tingkat Dasar dan Menengah.
    Dasar : Program Kerja Sekolah Tahun Pelajaran 2024/2025.

    MEMERINTAHKAN :

    Kepada :
    Nama : [NAMA_PETUGAS]
    NIP : [NIP_PETUGAS]
    Jabatan : [JABATAN_PETUGAS]

    Nama tersebut akan di beri tugas untuk menghadiri undangan tersebut pada :
    tanggal : [Hasil Ekstraksi Hari & Tanggal dari isi surat]
    Tempat : [Hasil Ekstraksi Tempat dari isi surat]

    Berikut surat tugas yang akan dilaksanakan dengan sebaik-baiknya.

    CATATAN: 
    - Gunakan titik dua (:) untuk memisahkan Label dan Isi.
    - Baris "Nama tersebut akan di beri tugas..." JANGAN diberi label "Untuk :", biarkan polos atau awali langsung dengan teks tersebut.
    - Jangan gunakan Markdown (seperti ** atau #).`;

    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt
    });

    let text = response.text || "";
    // Bersihkan intro AI jika masih ada
    text = text.replace(/^(Berikut|Ini|Naskah|Draft).*:(\n)?/i, '').trim();
    return text;
  } catch (error) {
    console.error("Gemini SPT Error:", error);
    return `Dasar : Surat dari ${invitationMail.sender} Nomor : ${invitationMail.referenceNumber}.\n\nMEMERINTAHKAN :\n\nKepada :\nNama : [NAMA_PETUGAS]\n\nNama tersebut akan di beri tugas untuk menghadiri kegiatan tersebut pada :\ntanggal : [Tanggal]\nTempat : [Tempat]`;
  }
};

export const generateSPPDContent = async (sptMail: any): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const prompt = `Anda adalah sekretaris administrasi sekolah. 
    Buatkan naskah SURAT PERINTAH PERJALANAN DINAS (SPPD) berdasarkan data Surat Perintah Tugas (SPT) berikut:
    
    DATA SPT:
    - Nomor SPT: ${sptMail.referenceNumber}
    - Perihal/Tugas: ${sptMail.subject}
    - Isi SPT: ${sptMail.description}
    
    INSTRUKSI FORMAT SPPD (Gunakan Label ini):
    Pejabat Pemberi Perintah : Kepala Sekolah
    Nama Pegawai yang diperintah : [AMBIL NAMA DARI SPT]
    NIP : [AMBIL NIP DARI SPT]
    Pangkat dan Golongan : [AMBIL JABATAN DARI SPT]
    Jabatan : Guru / Pegawai
    Maksud Perjalanan Dinas : ${sptMail.subject}
    Alat Angkut yang dipergunakan : Kendaraan Pribadi
    Tempat Berangkat : SDN [NAMA_SEKOLAH]
    Tempat Tujuan : [EKSTRAK TEMPAT TUJUAN DARI SPT]
    Lamanya Perjalanan Dinas : 1 (Satu) Hari
    Tanggal Berangkat : [EKSTRAK TANGGAL DARI SPT]
    Tanggal Kembali : [SAMA DENGAN TANGGAL BERANGKAT]
    Dasar Perintah : SPT Nomor ${sptMail.referenceNumber} Tanggal ${sptMail.date}
    Instansi / Akun : Dana BOS / Sekolah
    Keterangan Lain-lain : -
    
    CATATAN: 
    - Gunakan titik dua (:) sebagai pemisah.
    - Jangan gunakan Markdown.
    - Pastikan ekstraksi tanggal dan tempat dari SPT akurat.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt
    });

    return (response.text || "").trim();
  } catch (error) {
    console.error("Gemini SPPD Error:", error);
    return `Pejabat Pemberi Perintah : Kepala Sekolah\nNama Pegawai : [NAMA_PETUGAS]\nMaksud : Menghadiri ${sptMail.subject}\nDasar Perintah : SPT Nomor ${sptMail.referenceNumber}`;
  }
};

export const suggestReply = async (incomingMailText: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: `Buatkan draf surat balasan untuk: "${incomingMailText}"`
    });
    return response.text || "";
  } catch (error) {
    return "";
  }
};

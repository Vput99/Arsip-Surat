
import { GoogleGenAI, Type } from "@google/genai";
import { AIAnalysisResult, UrgencyLevel } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeLetter = async (text: string, imageData?: string): Promise<AIAnalysisResult | null> => {
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

export const generateNotulenContent = async (rawInput: string): Promise<string> => {
  try {
    const prompt = `Anda adalah Notulis Rapat profesional di sekolah. 
    Buatkan draf NOTULEN RAPAT yang lengkap dan rapi berdasarkan poin singkat berikut: "${rawInput}"
    
    FORMAT OUTPUT (Gunakan Label ini):
    Hari / Tanggal : [Hari, Tanggal]
    Waktu : [Jam]
    Tempat : [Tempat]
    Acara : [Nama Rapat]
    Pemimpin Rapat : [Nama]
    Notulis : [Nama]

    HASIL RAPAT / PEMBAHASAN :

    1. Pembukaan oleh pemimpin rapat.
    2. [Gunakan bahasa dinas untuk menjelaskan poin pembahasan 1]
    3. [Gunakan bahasa dinas untuk menjelaskan poin pembahasan 2]
    4. Masukan dan saran : [Tambahkan saran normatif yang relevan]
    5. Kesimpulan rapat : [Tuliskan kesimpulan yang kuat]

    Jangan gunakan Markdown (** atau #). Pisahkan label dengan titik dua (:).`;

    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt
    });
    return (response.text || "").trim();
  } catch (e) {
    return "Gagal generate notulen.";
  }
};

export const generateLaporanSPPDContent = async (sptContext: string): Promise<string> => {
  try {
    const prompt = `Anda adalah staf tata usaha sekolah. 
    Buatlah LAPORAN HASIL PERJALANAN DINAS berdasarkan konteks tugas berikut: "${sptContext}"
    
    FORMAT OUTPUT:
    Kepada Yth.
    Kepala SDN [NAMA_SEKOLAH]
    di Tempat

    1. Dasar Pelaksanaan : Surat Perintah Tugas (SPT) Nomor [NOMOR] Tanggal [TANGGAL].
    2. Maksud / Tujuan : [EKSTRAK TUJUAN]
    3. Waktu Pelaksanaan : [EKSTRAK WAKTU]
    4. Tempat Tujuan : [EKSTRAK TEMPAT]

    HASIL KEGIATAN :

    [Tulis narasi minimal 3 paragraf pendek yang menjelaskan proses kegiatan, materi yang didapat, dan tindak lanjut bagi sekolah dengan bahasa formal]

    Demikian laporan perjalanan dinas ini kami sampaikan sebagai laporan pertanggungjawaban.

    Jangan gunakan Markdown (** atau #).`;

    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt
    });
    return (response.text || "").trim();
  } catch (e) {
    return "Gagal generate laporan SPPD.";
  }
};

export const generateSPTContent = async (invitationMail: any): Promise<string> => {
  try {
    const prompt = `Anda adalah sekretaris administrasi sekolah dasar yang sangat teliti. 
    Buatkan naskah SURAT PERINTAH TUGAS (SPT) berdasarkan data Surat Masuk berikut:
    
    DATA SURAT MASUK:
    - Nomor: ${invitationMail.referenceNumber}
    - Dari: ${invitationMail.sender}
    - Perihal: ${invitationMail.subject}
    - Isi: ${invitationMail.description}
    
    ATURAN FORMAT:
    Dasar : Surat dari ${invitationMail.sender} Nomor : ${invitationMail.referenceNumber} tentang ${invitationMail.subject}.
    Dasar : Program Kerja Sekolah Tahun Pelajaran 2024/2025.

    MEMERINTAHKAN :

    Kepada :
    Nama : [NAMA_PETUGAS]
    NIP : [NIP_PETUGAS]
    Jabatan : [JABATAN_PETUGAS]

    Nama tersebut akan di beri tugas untuk menghadiri undangan tersebut pada :
    tanggal : [Hasil Ekstraksi]
    Tempat : [Hasil Ekstraksi]

    Berikut surat tugas yang akan dilaksanakan dengan sebaik-baiknya.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt
    });
    return (response.text || "").trim();
  } catch (error) {
    return "Gagal generate SPT.";
  }
};

export const generateSPPDContent = async (sptMail: any): Promise<string> => {
  try {
    const prompt = `Buatkan draf SPPD berdasarkan SPT Nomor ${sptMail.referenceNumber} perihal ${sptMail.subject}. Gunakan format resmi sekolah.`;
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt
    });
    return (response.text || "").trim();
  } catch (error) {
    return "Gagal generate SPPD.";
  }
};

export const suggestReply = async (incomingMailText: string): Promise<string> => {
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

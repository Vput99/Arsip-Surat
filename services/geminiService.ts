
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
    
    INSTRUKSI FORMAT KHUSUS (WAJIB DIIKUTI):
    1. Bagian 'Dasar' baris pertama harus berbunyi: "Surat dari ${invitationMail.sender} Nomor : ${invitationMail.referenceNumber} tentang ${invitationMail.subject} pada satuan pendidikan tingkat Dasar dan Menengah."
    2. Tambahkan Dasar baris kedua: "Program Kerja Sekolah Tahun Pelajaran 2024/2025."
    3. Setelah bagian 'Kepada', buat bagian 'Untuk' dengan kalimat pengantar: "Nama tersebut akan di beri tugas untuk menghadiri undangan tersebut pada :"
    4. Di bawah kalimat pengantar tersebut, berikan rincian berikut (ambil dari isi surat):
       tanggal : [Hari], [Tanggal Bulan Tahun]
       Tempat : [Lokasi/Tempat Kegiatan]
    5. Tambahkan kalimat penutup di akhir: "Berikut surat tugas yang akan dilaksanakan dengan sebaik-baiknya."
    
    OUTPUT HARUS BERUPA TEKS POLOS DENGAN FORMAT BERIKUT (Gunakan Titik Dua):
    Dasar : [Isi Dasar 1]
    Dasar : [Isi Dasar 2]

    MEMERINTAHKAN :

    Kepada :
    Nama : [NAMA_PETUGAS]
    NIP : [NIP_PETUGAS]
    Jabatan : [JABATAN_PETUGAS]

    Untuk : Nama tersebut akan di beri tugas untuk menghadiri undangan tersebut pada :
    tanggal : [Hasil Ekstraksi]
    Tempat : [Hasil Ekstraksi]

    Berikut surat tugas yang akan dilaksanakan dengan sebaik-baiknya.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt
    });

    let text = response.text || "";
    text = text.replace(/^(Berikut|Ini|Naskah|Draft).*:(\n)?/i, '').trim();
    return text;
  } catch (error) {
    console.error("Gemini SPT Error:", error);
    return `Dasar : Surat dari ${invitationMail.sender} Nomor : ${invitationMail.referenceNumber}.\n\nMEMERINTAHKAN :\n\nKepada :\nNama : [NAMA_PETUGAS]\n\nUntuk : Menghadiri kegiatan ${invitationMail.subject}.`;
  }
};

export const generateSPPDContent = async (sptMail: any): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const prompt = `Anda adalah sekretaris administrasi sekolah dasar. 
    Buatkan naskah SURAT PERINTAH PERJALANAN DINAS (SPPD) berdasarkan data Surat Perintah Tugas (SPT) berikut:
    
    DATA SPT:
    - Nomor SPT: ${sptMail.referenceNumber}
    - Perihal/Tugas: ${sptMail.subject}
    - Isi SPT: ${sptMail.description}
    
    INSTRUKSI FORMAT SPPD:
    1. Pejabat Pemberi Perintah : Kepala SDN [NAMA_SEKOLAH]
    2. Nama Pegawai yang diperintah : [AMBIL DARI SPT JIKA ADA, ATAU [NAMA_PETUGAS]]
    3. Maksud Perjalanan Dinas : Menghadiri ${sptMail.subject}
    4. Alat Angkut : Kendaraan Pribadi / Umum
    5. Tempat Berangkat : SDN [NAMA_SEKOLAH]
    6. Tempat Tujuan : [EKSTRAK DARI SPT]
    7. Lamanya Perjalanan Dinas : 1 (Satu) Hari
    8. Tanggal Berangkat : [EKSTRAK TANGGAL DARI SPT]
    9. Tanggal Kembali : [SAMA DENGAN TANGGAL BERANGKAT]
    10. Dasar Perintah : SPT Nomor ${sptMail.referenceNumber} Tanggal ${sptMail.date}
    
    OUTPUT HARUS BERUPA TEKS POLOS DENGAN FORMAT KEY-VALUE TITIK DUA:
    Pejabat pemberi perintah : Kepala Sekolah
    Nama pegawai yang diperintah : [NAMA_PETUGAS]
    NIP : [NIP_PETUGAS]
    Pangkat dan Golongan : [JABATAN_PETUGAS]
    Maksud Perjalanan Dinas : ${sptMail.subject}
    Alat angkut yang dipergunakan : Kendaraan Pribadi
    Tempat berangkat : SDN [NAMA_SEKOLAH]
    Tempat tujuan : [Ekstrak Tempat]
    Lamanya perjalanan dinas : 1 (Satu) Hari
    Tanggal berangkat : [Ekstrak Tanggal]
    Tanggal kembali : [Ekstrak Tanggal]
    Dasar Perintah : SPT Nomor ${sptMail.referenceNumber} Tanggal ${sptMail.date}`;

    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt
    });

    return (response.text || "").trim();
  } catch (error) {
    console.error("Gemini SPPD Error:", error);
    return `Pejabat pemberi perintah : Kepala Sekolah\nNama pegawai : [NAMA_PETUGAS]\nMaksud : Menghadiri ${sptMail.subject}\nDasar : SPT Nomor ${sptMail.referenceNumber}`;
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

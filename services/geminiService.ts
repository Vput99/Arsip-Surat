
// Inisialisasi AI dengan API Key dari environment
import { GoogleGenAI, Type } from "@google/genai";
import { AIAnalysisResult, UrgencyLevel, Mail } from "../types";

/**
 * Analisis Surat Masuk
 */
export const analyzeLetter = async (text: string, imageData?: string): Promise<AIAnalysisResult | null> => {
  try {
    const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_API_KEY });
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
      model: "gemini-1.5-flash",
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
    const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_API_KEY });
    const prompt = `Analisis data pembayaran honor sekolah berikut dan buatkan ringkasan eksekutif profesional untuk laporan BOS:
    Kategori: ${data.category}
    Bulan: ${data.period}
    Data: ${JSON.stringify(data.staff)}
    
    Berikan:
    1. Total Bruto, Pajak PPh21, dan Total Netto.
    2. Ringkasan jumlah kehadiran tertinggi dan terendah.
    3. Narasi singkat untuk dasar pencairan dana BOS.`;

    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: { parts: [{ text: prompt }] }
    });
    
    return response.text || "Gagal melakukan analisis.";
  } catch (e) {
    return "Analisis AI tidak tersedia saat ini.";
  }
};

/**
 * Pembuatan SPT dari Surat Undangan Masuk
 */
export const generateSPTFromInvitation = async (invitation: Mail): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_API_KEY });
    const prompt = `Buatkan naskah SURAT PERINTAH TUGAS (SPT) berdasarkan data surat masuk berikut:
    Dari: ${invitation.sender}
    Nomor: ${invitation.referenceNumber}
    Perihal: ${invitation.subject}
    Deskripsi: ${invitation.description}
    
    ATURAN:
    1. Mulai langsung dari naskah 'Dasar :'.
    2. Gunakan placeholder [NAMA_PETUGAS], [NIP_PETUGAS], dan [JABATAN_PETUGAS].
    3. Sertakan detail Waktu dan Tempat dari deskripsi undangan.
    4. Akhiri dengan kalimat penutup tanggung jawab.`;

    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: { parts: [{ text: prompt }] }
    });
    
    return response.text || "Gagal menghasilkan teks.";
  } catch (e) {
    return "Gagal generate SPT secara otomatis.";
  }
};

/**
 * Pembuatan SPPD dari naskah SPT
 * FUNGSI KRITIKAL: Membedah SPT untuk menjadi 10 poin SPPD
 */
export const generateSPPDFromSPT = async (spt: Mail): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_API_KEY });
    const prompt = `Tugas: Konversi naskah SURAT PERINTAH TUGAS (SPT) menjadi naskah SURAT PERINTAH PERJALANAN DINAS (SPPD).

DATA SPT:
Subjek: ${spt.subject}
Naskah SPT: "${spt.description}"
Tanggal SPT: ${spt.date}

INSTRUKSI KHUSUS:
1. Identifikasi Nama, NIP, dan Jabatan. Jika masih berupa placeholder [NAMA_PETUGAS], biarkan tetap sebagai placeholder.
2. Hitung 'Lamanya Perjalanan Dinas'. Jika kegiatan berlangsung di tanggal yang sama, tulis "1 (Satu) Hari". Jika rentang, hitung selisih harinya.
3. Ekstrak 'Tempat Tujuan' dari bagian 'Tempat :' pada naskah SPT.
4. HASIL HARUS BERUPA 10 POIN BERIKUT (HANYA POINNYA SAJA):

1. Pejabat Pemberi Perintah : Kepala Sekolah
2. Nama Pegawai yang diperintah : [Isi Nama]
3. a. Pangkat dan Golongan : [Isi Pangkat]
   b. Jabatan / Instansi : [Isi Jabatan]
   c. Tingkat Biaya Perjalanan : -
4. Maksud Perjalanan Dinas : ${spt.subject}
5. Alat angkut yang dipergunakan : Kendaraan Pribadi
6. a. Tempat Berangkat : SDN Tempurejo 1
   b. Tempat Tujuan : [Isi Tujuan]
7. a. Lamanya Perjalanan Dinas : [X] Hari
   b. Tanggal Berangkat : [Tgl Mulai]
   c. Tanggal Kembali : [Tgl Selesai]
8. Pengikut : Nama
   1. -
9. Pembebanan Anggaran :
   a. Instansi : SDN Tempurejo 1
   b. Akun / Mata Anggaran : Dana BOS
10. Keterangan lain-lain : -`;

    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "Anda adalah asisten administrasi sekolah yang presisi. Tugas Anda adalah mengekstrak data dari SPT dan memformatnya menjadi 10 poin SPPD standar. Jangan memberikan teks narasi selain 10 poin tersebut.",
        temperature: 0.1, // Rendah agar konsisten
      }
    });
    
    return response.text?.trim() || "Gagal menghasilkan naskah SPPD.";
  } catch (e) {
    console.error("SPPD Gen Error:", e);
    return "Gagal memproses AI untuk SPPD. Silakan periksa koneksi atau naskah SPT asal.";
  }
};

/**
 * Pembuatan Laporan/Notulen
 */
export const generateLaporanDanNotulen = async (mailContext: Mail, type: 'LAPORAN' | 'NOTULEN'): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_API_KEY });
    const prompt = type === 'LAPORAN' 
      ? `Buatkan naskah LAPORAN HASIL PERJALANAN DINAS. Perihal: "${mailContext.subject}". Deskripsi awal: "${mailContext.description}". Tulis 3 paragraf naratif.`
      : `Buatkan naskah NOTULEN RAPAT. Perihal: "${mailContext.subject}". Pembahasan: "${mailContext.description}". Tulis dalam poin-poin pembahasan.`;

    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
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
    const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: { parts: [{ text: `Rapikan catatan rapat berikut menjadi naskah notulen resmi (Hanya isi): "${context}"` }] }
    });
    return response.text || "";
  } catch (e) { return "Gagal merapikan notulen."; }
};

export const generateLaporanSPPDContent = async (context: string): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: { parts: [{ text: `Buat narasi laporan perjalanan dinas dari poin-poin ini: "${context}"` }] }
    });
    return response.text || "";
  } catch (e) { return "Gagal merapikan laporan."; }
};

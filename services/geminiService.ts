import { GoogleGenAI, Type } from "@google/genai";
import { AIAnalysisResult, UrgencyLevel } from "../types";

const initGemini = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("API_KEY is not set via environment variables.");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const analyzeLetter = async (text: string): Promise<AIAnalysisResult | null> => {
  const ai = initGemini();
  if (!ai) return null;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analisis teks surat berikut ini. Berikan ringkasan singkat (maksimal 2 kalimat), kategori surat (Misalnya: Undangan, Dinas, Pemberitahuan, dll), tingkat urgensi (Biasa, Penting, Segera), dan sentimen umum.
      
      Teks Surat:
      "${text}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING, description: "Ringkasan isi surat maksimal 2 kalimat" },
            category: { type: Type.STRING, description: "Kategori surat yang relevan" },
            urgency: { type: Type.STRING, enum: [UrgencyLevel.LOW, UrgencyLevel.MEDIUM, UrgencyLevel.HIGH] },
            sentiment: { type: Type.STRING, description: "Nada atau sentimen surat" }
          },
          required: ["summary", "category", "urgency", "sentiment"]
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

export const suggestReply = async (incomingMailText: string): Promise<string> => {
  const ai = initGemini();
  if (!ai) return "Gagal menghubungkan ke AI.";

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
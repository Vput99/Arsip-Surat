import { GoogleGenAI, Type } from "@google/genai";
import { AIAnalysisResult, UrgencyLevel } from "../types";

// The Google GenAI SDK always uses process.env.API_KEY
// We initialize it right before making a call to ensure it uses the most up-to-date key.

export const analyzeLetter = async (text: string): Promise<AIAnalysisResult | null> => {
  // Always use { apiKey: process.env.API_KEY }
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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

    // response.text is a property, not a method
    const result = JSON.parse(response.text || "{}");
    return result as AIAnalysisResult;

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return null;
  }
};

export const suggestReply = async (incomingMailText: string): Promise<string> => {
  // Always use { apiKey: process.env.API_KEY }
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Buatkan draf surat balasan resmi untuk sekolah dasar berdasarkan surat masuk berikut. Gunakan bahasa Indonesia yang sopan dan format surat dinas yang benar.
      
      Surat Masuk:
      "${incomingMailText}"`
    });
    // response.text is a property, not a method
    return response.text || "Tidak ada respons dari AI.";
  } catch (error) {
    console.error("Gemini Reply Error:", error);
    return "Terjadi kesalahan saat membuat balasan.";
  }
};

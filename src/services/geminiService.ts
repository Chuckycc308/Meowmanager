import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function analyzeCatPhoto(base64Image: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: base64Image.split(",")[1],
              },
            },
            {
              text: "Analyze this cat photo. Identify the breed if possible, and assess its general health status (eyes, fur, weight appearance). Provide the output in JSON format with fields: breed, healthStatus, and observations.",
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            breed: { type: Type.STRING },
            healthStatus: { type: Type.STRING },
            observations: { type: Type.STRING },
          },
          required: ["breed", "healthStatus", "observations"],
        },
      },
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Error analyzing cat photo:", error);
    return null;
  }
}

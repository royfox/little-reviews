import { GoogleGenAI, Type } from "@google/genai";
import { MediaType } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getMediaMetadata = async (title: string, type: MediaType) => {
  try {
    const prompt = `
      I am writing a review for a ${type} titled "${title}". 
      Please provide the release year, the author/artist (if applicable for books or music, otherwise leave empty), and a very short (max 2 sentences) objective summary of what it is to help start my review.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            releaseYear: {
              type: Type.INTEGER,
              description: "The year the media was released",
            },
            author: {
              type: Type.STRING,
              description: "The author or artist. Return empty string or null if it is a Movie or TV Show.",
            },
            summary: {
              type: Type.STRING,
              description: "A short 1-2 sentence summary of the plot or content.",
            },
          },
          required: ["releaseYear", "summary"],
        },
      },
    });

    const text = response.text;
    if (!text) return null;
    return JSON.parse(text);
  } catch (error) {
    console.error("Error fetching metadata from Gemini:", error);
    return null;
  }
};

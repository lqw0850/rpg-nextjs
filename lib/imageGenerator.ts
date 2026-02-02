import { GoogleGenAI } from "@google/genai";
import type { GameSession } from "./types";

export class ImageGenerator {
  private ai: GoogleGenAI;

  constructor(ai: GoogleGenAI) {
    this.ai = ai;
  }

  public async generateImage(
    session: GameSession,
    narrative: string,
    isOcPortrait: boolean = false,
    ocVisualDescription?: string
  ): Promise<string | null> {
    try {
      const context = session.ipName ? `Style consistent with the world of ${session.ipName}.` : "Fantasy style.";
      
      // If we have an OC description, include it in the prompt
      let characterContext = "";
      const visualDesc = ocVisualDescription || session.ocVisualDescription;
      if (visualDesc) {
        characterContext = `The MAIN CHARACTER in the image MUST look like this: ${visualDesc}.`;
      }

      let prompt = "";
      if (isOcPortrait) {
        // Specific prompt for OC generation
         prompt = `Character Portrait, high quality, masterpiece. ${context} ${characterContext} ${narrative}`;
      } else {
        // Scene generation
         const shortNarrative = narrative.length > 500 ? narrative.substring(0, 500) : narrative;
         prompt = `Realistic hand-drawn illustration style, detailed background, cinematic lighting, masterpiece. ${context} ${characterContext} Scene action: ${shortNarrative}`;
      }

      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: prompt }] },
      });
      const parts = response.candidates?.[0]?.content?.parts;
      if (parts) {
        for (const part of parts) {
          if (part.inlineData && part.inlineData.data) {
            return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          }
        }
      }
      return null;
    } catch (error: any) {
      if (error.status === 'RESOURCE_EXHAUSTED' || error.code === 429) {
          console.warn("Image generation quota exceeded. Skipping image.");
          return null; // Silently fail so the story continues
      }
      console.error("Failed to generate image:", error);
      return null;
    }
  }
}

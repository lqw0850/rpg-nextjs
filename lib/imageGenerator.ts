import { GoogleGenAI } from "@google/genai";
import type { GameSession } from "./types";
import { ART_STYLES, DEFAULT_ART_STYLE, getArtStyleById } from './artStyles';

export class ImageGenerator {
  private ai: GoogleGenAI;

  constructor(ai: GoogleGenAI) {
    this.ai = ai;
  }

  public async generateImage(
    session: GameSession,
    narrative: string,
    isOcPortrait: boolean = false,
    ocVisualDescription?: string,
    artStyle?: string
  ): Promise<string | null> {
    try {
      const context = session.ipName ? `Style consistent with the world of ${session.ipName}.` : "Fantasy style.";
      // If we have an OC description, include it in the prompt
      let characterContext = "";
      const visualDesc = ocVisualDescription || session.ocVisualDescription;
      if (visualDesc) {
        characterContext = `The MAIN CHARACTER in the image MUST look like this: ${visualDesc}.`;
      }

      // 处理画风
      let stylePrompt = "";
      if (artStyle) {
        const selectedStyle = getArtStyleById(artStyle);
        if (selectedStyle) {
          stylePrompt = selectedStyle.prompt;
          // 记录画风到会话中，用于后续场景生成
          (session as any).artStyle = artStyle;
        }
      }
      
      // 如果没有指定画风，使用会话中保存的画风
      if (!stylePrompt && (session as any).artStyle) {
        const sessionStyle = getArtStyleById((session as any).artStyle);
        if (sessionStyle) {
          stylePrompt = sessionStyle.prompt;
        }
      }

      let prompt = "";
      if (isOcPortrait) {
        // Specific prompt for OC generation
        prompt = `Character Portrait, high quality, masterpiece. ${context} ${characterContext} ${narrative} ${stylePrompt}`;
      } else {
        // Scene generation
        const shortNarrative = narrative.length > 500 ? narrative.substring(0, 500) : narrative;
        prompt = `Generate a wide landscape background image suitable for full-screen display. The image should be designed to cover the entire screen and work well with different aspect ratios (16:9, 4:3, 3:2, 21:9). Use a panoramic composition with the main action centered but with visual interest extending to the edges. The image should be safe for cropping on different screen sizes. ${stylePrompt || 'Realistic hand-drawn illustration style, detailed background, cinematic lighting, masterpiece, wide angle view.'} ${context} ${characterContext} Scene action: ${shortNarrative}`;
      }

      console.log(prompt)
      const response = await this.ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
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

import { GoogleGenAI } from "@google/genai";
import { ART_STYLES, getArtStyleById } from './artStyles';

export class ImageGenerator {
  private ai: GoogleGenAI;

  constructor(ai: GoogleGenAI) {
    this.ai = ai;
  }

  public async generateImage(
    ipName: string,
    narrative: string,
    isOcPortrait: boolean = false,
    ocVisualDescription?: string,
    artStyle?: string
  ): Promise<string | null> {
    try {
      const context = ipName ? `Style consistent with world of ${ipName}.` : "Fantasy style.";
      let characterContext = "";
      const visualDesc = ocVisualDescription;
      if (visualDesc) {
        characterContext = `The MAIN CHARACTER in the image MUST look like this: ${visualDesc}.`;
      }

      let stylePrompt = "";
      if (artStyle) {
        const selectedStyle = getArtStyleById(artStyle);
        if (selectedStyle) {
          stylePrompt = selectedStyle.prompt;
        }
      }

      let prompt = "";
      if (isOcPortrait) {
        prompt = `Character Portrait, high quality, masterpiece. Not contain any text.
${context} ${characterContext} ${narrative} 
art style: ${stylePrompt}`;
      } else {
        const shortNarrative = narrative.length > 500 ? narrative.substring(0, 500) : narrative;
        prompt = `Generate a wide landscape background image suitable for full-screen display. The image should be designed to cover entire screen and work well with different aspect ratios (16:9, 4:3, 3:2, 21:9). Not contain any text. Use a panoramic composition with main action centered but with visual interest extending to edges. The image should be safe for cropping on different screen sizes. 
artStyle: ${stylePrompt}
${context} ${characterContext} Scene action: ${shortNarrative}`;
      }

      // console.log('generate-image', prompt);
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
          return null;
      }
      console.error("Failed to generate image:", error);
      return null;
    }
  }
}

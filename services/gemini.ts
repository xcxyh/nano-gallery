import { GoogleGenAI } from "@google/genai";
import { GenerationConfig } from "../types";
import { MODEL_NAME } from "../constants";

// Helper to ensure API key is selected
export const ensureApiKey = async (): Promise<boolean> => {
  const aiStudio = (window as any).aistudio;
  if (typeof aiStudio === 'undefined') {
    console.error("AI Studio environment not detected.");
    return false;
  }
  const hasKey = await aiStudio.hasSelectedApiKey();
  if (!hasKey) {
    try {
      await aiStudio.openSelectKey();
      return await aiStudio.hasSelectedApiKey();
    } catch (e) {
      console.error("Failed to select API key", e);
      return false;
    }
  }
  return true;
};

export const generateImage = async (config: GenerationConfig): Promise<string> => {
  const ready = await ensureApiKey();
  if (!ready) {
    throw new Error("API Key not selected. Please select a paid API key to continue.");
  }

  // Always create a new instance to get the latest injected key
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  try {
    const parts: any[] = [];

    // Add reference image if present
    if (config.referenceImage) {
      // Expecting format: "data:image/png;base64,..."
      const [metadata, base64Data] = config.referenceImage.split(',');
      if (base64Data && metadata) {
        const mimeType = metadata.match(/:(.*?);/)?.[1] || 'image/png';
        parts.push({
          inlineData: {
            data: base64Data,
            mimeType: mimeType
          }
        });
      }
    }

    // Add text prompt
    parts.push({ text: config.prompt });

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: parts,
      },
      config: {
        imageConfig: {
          aspectRatio: config.aspectRatio,
          imageSize: config.imageSize,
        }
      }
    });

    if (!response.candidates || response.candidates.length === 0) {
      throw new Error("No candidates returned from the model.");
    }

    const content = response.candidates[0].content;
    
    // Find image part
    let base64Image = "";
    if (content && content.parts) {
      for (const part of content.parts) {
        if (part.inlineData && part.inlineData.data) {
          base64Image = part.inlineData.data;
          break; // Found it
        }
      }
    }

    if (!base64Image) {
      throw new Error("No image data found in the response.");
    }

    return `data:image/png;base64,${base64Image}`;

  } catch (error: any) {
    console.error("Generation error:", error);
    // Enhance error message if it looks like a permission issue
    if (error.message && error.message.includes("403")) {
      throw new Error("Access Denied. Please ensure you have selected a valid project with billing enabled for Gemini 3 Pro.");
    }
    throw error;
  }
};
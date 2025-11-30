export interface User {
  id: string;
  name: string;
  avatar: string;
}

export interface Template {
  id: string;
  title: string;
  prompt: string;
  aspectRatio: AspectRatio;
  imageUrl?: string;
  referenceImage?: string; // Base64 string of the input image
  author?: string;
  ownerId?: string; // 'system' or user.id
  isPublished?: boolean;
}

export type AspectRatio = "1:1" | "3:4" | "4:3" | "9:16" | "16:9";
export type ImageSize = "1K" | "2K" | "4K";

export interface GenerationConfig {
  prompt: string;
  aspectRatio: AspectRatio;
  imageSize: ImageSize;
  referenceImage?: string; // Base64 string for generation
}

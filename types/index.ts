export interface User {
  id: string;
  name: string;
  avatar: string;
  role: 'user' | 'admin';
  credits: number;
}

export interface Template {
  id: string;
  title: string;
  prompt: string;
  aspectRatio: AspectRatio;
  imageUrl?: string;
  referenceImage?: string; // Base64
  author?: string;
  ownerId?: string; // 'system' or user.id
  isPublished?: boolean;
  status?: 'pending' | 'approved' | 'rejected';
}

export type AspectRatio = "1:1" | "3:4" | "4:3" | "9:16" | "16:9";
export type ImageSize = "1K" | "2K" | "4K";

export interface GenerationConfig {
  prompt: string;
  aspectRatio: AspectRatio;
  imageSize: ImageSize;
  imageCount?: number;
  referenceImage?: string;
}

export interface SessionPayload {
  user: User;
  expires: Date;
}

import { Template } from "./types";

export const MODEL_NAME = "gemini-3-pro-image-preview";

export const INITIAL_TEMPLATES: Template[] = [
  {
    id: "t-1",
    title: "Neon Cyber Samurai",
    prompt: "A close-up portrait of a futuristic samurai with neon glowing armor, rain-slicked streets in the background, cyberpunk aesthetic, high detail, 8k resolution, cinematic lighting, teal and magenta color palette.",
    aspectRatio: "3:4",
    imageUrl: "https://picsum.photos/600/800?random=1",
    author: "System"
  },
  {
    id: "t-2",
    title: "Ethereal Glass Sculpture",
    prompt: "A complex geometric sculpture made of iridescent glass, floating in a void, soft studio lighting, caustics, dispersion of light, minimal background, photorealistic.",
    aspectRatio: "1:1",
    imageUrl: "https://picsum.photos/600/600?random=2",
    author: "System"
  },
  {
    id: "t-3",
    title: "Vaporwave Sunset",
    prompt: "A retro 80s vaporwave landscape, grid floor, purple mountains, large sun on the horizon, palm trees silhouetted, glitch art aesthetic, grainy texture.",
    aspectRatio: "16:9",
    imageUrl: "https://picsum.photos/800/450?random=3",
    author: "System"
  },
  {
    id: "t-4",
    title: "Minimalist Architecture",
    prompt: "White minimalist concrete architecture against a deep blue sky, strong shadows, geometric shapes, brutalist influence, ultra-wide angle shot.",
    aspectRatio: "4:3",
    imageUrl: "https://picsum.photos/800/600?random=4",
    author: "System"
  },
  {
    id: "t-5",
    title: "Fantasy Forest Spirit",
    prompt: "A tiny glowing spirit creature resting on a mossy mushroom in an ancient forest, bokeh background, magical sparkles, macro photography, soft warm light.",
    aspectRatio: "1:1",
    imageUrl: "https://picsum.photos/600/600?random=5",
    author: "System"
  }
];

export const ASPECT_RATIOS = ["1:1", "3:4", "4:3", "9:16", "16:9"] as const;

'use server';

import { GoogleGenAI } from "@google/genai";
import { createClient } from "@/utils/supabase/server";
import { supabaseAdmin } from "@/utils/supabase/admin";
import { GenerationConfig, User, Template } from "@/types";
import { revalidatePath } from "next/cache";

const ADMIN_CODE = process.env.ADMIN_ACCESS_CODE || "BANANA_MASTER";
const MODEL_NAME = "gemini-3-pro-image-preview";

// --- Auth Actions ---

export async function loginAction(name: string, password: string) {
  try {
    const supabase = await createClient();
    const email = `${name.toLowerCase().replace(/\s+/g, '')}@nanobanana.app`;

    // 1. Explicit Sign In
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      return { success: false, error: "Invalid username or password." };
    }

    // 2. Fetch Profile
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    const role = profile?.role || 'user';
    const credits = profile?.credits ?? 0;

    revalidatePath('/');
    return { 
      success: true, 
      user: { 
          id: data.user.id, 
          name: profile?.name || name, 
          role: role as 'admin'|'user', 
          credits, 
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.name || name}` 
      } as User 
    };
  } catch (err: any) {
    console.error("Login Error:", err);
    return { success: false, error: "Authentication service unavailable." };
  }
}

export async function registerAction(name: string, password: string, accessCode?: string) {
  try {
    const supabase = await createClient();
    const email = `${name.toLowerCase().replace(/\s+/g, '')}@nanobanana.app`;

    // 1. Sign Up
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name }, // Metadata
      },
    });

    if (error) {
      console.error("Signup Error:", error);
      return { success: false, error: error.message };
    }

    if (!data.user) {
      return { success: false, error: "Registration failed." };
    }

    // 2. Determine Role and Credits based on Access Code
    const isSuperUser = accessCode === ADMIN_CODE;
    const role = isSuperUser ? 'admin' : 'user';
    const credits = isSuperUser ? 9999 : 3;

    // 3. Create Profile (Admin Client to bypass RLS)
    const { error: profileError } = await supabaseAdmin.from('profiles').insert({
      id: data.user.id,
      name: name,
      role: role,
      credits: credits
    });

    if (profileError) {
        // Fallback: If profile exists (rare race condition), try upsert
        await supabaseAdmin.from('profiles').upsert({
          id: data.user.id,
          name: name,
          role: role,
          credits: credits
        });
    }

    revalidatePath('/');
    return { 
      success: true, 
      user: { 
          id: data.user.id, 
          name, 
          role: role as 'admin'|'user', 
          credits, 
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}` 
      } as User 
    };
  } catch (err: any) {
    console.error("Register Exception:", err);
    return { success: false, error: "Registration service unavailable." };
  }
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath('/');
  return { success: true };
}

export async function getSessionAction() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    // Fetch profile details
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!profile) return null;

    return {
      id: user.id,
      name: profile.name,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.name}`,
      role: profile.role as 'user' | 'admin',
      credits: profile.credits
    } as User;
  } catch (e) {
    return null;
  }
}

// --- Generation Action ---

export async function generateImageAction(config: GenerationConfig): Promise<{ success: boolean; imageBase64?: string; imageUrl?: string; error?: string; remainingCredits?: number }> {
  const supabase = await createClient();
  
  // 1. Verify User
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  // 2. Check Credits (Server Side DB Check)
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('credits, role')
    .eq('id', user.id)
    .single();

  if (!profile) return { success: false, error: "Profile not found" };

  if (profile.role !== 'admin' && profile.credits <= 0) {
    return { success: false, error: "Insufficient credits" };
  }

  // 3. Call Gemini API
  const apiKey = process.env.API_KEY;
  if (!apiKey) return { success: false, error: "API Key missing" };
  
  const ai = new GoogleGenAI({ apiKey });

  try {
    const parts: any[] = [{ text: config.prompt }];
    
    // Handle reference image if needed
    if (config.referenceImage) {
        const [metadata, base64Data] = config.referenceImage.split(',');
        const mimeType = metadata.match(/:(.*?);/)?.[1] || 'image/png';
        parts.unshift({ inlineData: { data: base64Data, mimeType } });
    }

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: { parts },
      config: { imageConfig: { aspectRatio: config.aspectRatio, imageSize: config.imageSize } }
    });

    const content = response.candidates?.[0]?.content;
    const base64Image = content?.parts?.find(p => p.inlineData)?.inlineData?.data;

    if (!base64Image) throw new Error("No image generated");

    // 4. Upload to Supabase Storage
    const buffer = Buffer.from(base64Image, 'base64');
    const fileName = `${user.id}/${Date.now()}.png`;
    
    const { error: uploadError } = await supabaseAdmin.storage
      .from('images')
      .upload(fileName, buffer, { contentType: 'image/png' });

    if (uploadError) throw new Error("Failed to upload image: " + uploadError.message);

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('images')
      .getPublicUrl(fileName);

    // 5. Deduct Credits
    let newCredits = profile.credits;
    if (profile.role !== 'admin') {
      newCredits = Math.max(0, profile.credits - 1);
      await supabaseAdmin
        .from('profiles')
        .update({ credits: newCredits })
        .eq('id', user.id);
    }

    return { 
      success: true, 
      imageBase64: `data:image/png;base64,${base64Image}`, 
      imageUrl: publicUrl,
      remainingCredits: newCredits
    };

  } catch (error: any) {
    console.error("Gen Error:", error);
    return { success: false, error: error.message };
  }
}

// --- Data Actions ---

export async function saveTemplateAction(template: Template) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false };

  // Convert FE Template model to DB columns
  const { error } = await supabase.from('templates').insert({
    title: template.title,
    prompt: template.prompt,
    aspect_ratio: template.aspectRatio,
    image_url: template.imageUrl,
    reference_image: template.referenceImage,
    author: template.author,
    owner_id: user.id,
    is_published: template.isPublished
  });

  if (error) {
      console.error("Save Error", error);
      return { success: false, error: error.message };
  }
  
  revalidatePath('/');
  return { success: true };
}

export async function getTemplatesAction() {
    const supabase = await createClient();
    
    const { data, error } = await supabase
        .from('templates')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) return [];

    return data.map((t: any) => ({
        id: t.id.toString(),
        title: t.title,
        prompt: t.prompt,
        aspectRatio: t.aspect_ratio,
        imageUrl: t.image_url,
        referenceImage: t.reference_image,
        author: t.author,
        ownerId: t.owner_id,
        isPublished: t.is_published
    })) as Template[];
}
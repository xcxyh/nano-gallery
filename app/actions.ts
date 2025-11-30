'use server';

import { GoogleGenAI } from "@google/genai";
import { createClient } from "@/utils/supabase/server";
import { supabaseAdmin } from "@/utils/supabase/admin";
import { GenerationConfig, User, Template } from "@/types";
import { revalidatePath } from "next/cache";
import { validateEmail, normalizeEmail, extractUsernameFromEmail } from "@/utils/username";

const ADMIN_CODE = process.env.ADMIN_ACCESS_CODE || "BANANA_MASTER";
const MODEL_NAME = "gemini-3-pro-image-preview";

// --- Auth Actions ---

export async function loginAction(email: string, password: string) {
  try {
    // 验证邮箱格式
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      return { success: false, error: emailValidation.error || "Invalid email format." };
    }

    const supabase = await createClient();
    // 规范化邮箱（转小写，去空格）
    const normalizedEmail = normalizeEmail(email);

    // 1. Explicit Sign In
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (error) {
      console.error("Login Error Details:", error);
      
      // 提供更详细的错误信息
      if (error.message.includes('Invalid login credentials') || error.message.includes('invalid_credentials')) {
        return { success: false, error: "邮箱或密码错误，请检查后重试" };
      }
      if (error.message.includes('Email not confirmed') || error.message.includes('email_not_confirmed')) {
        return { success: false, error: "请先确认您的邮箱地址。请检查您的邮箱收件箱（包括垃圾邮件文件夹）" };
      }
      if (error.message.includes('User not found')) {
        return { success: false, error: "该邮箱未注册，请先注册" };
      }
      
      return { success: false, error: error.message || "登录失败，请稍后重试" };
    }

    if (!data.user) {
      return { success: false, error: "登录失败，未获取到用户信息" };
    }

    // 2. Fetch Profile
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    const role = profile?.role || 'user';
    const credits = profile?.credits ?? 0;
    const displayName = profile?.name || extractUsernameFromEmail(normalizedEmail);

    revalidatePath('/');
    return { 
      success: true, 
      user: { 
          id: data.user.id, 
          name: displayName, 
          role: role as 'admin'|'user', 
          credits, 
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${displayName}` 
      } as User 
    };
  } catch (err: any) {
    console.error("Login Error:", err);
    return { success: false, error: "Authentication service unavailable." };
  }
}

export async function registerAction(email: string, password: string, accessCode?: string) {
  try {
    // 验证邮箱格式
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      return { success: false, error: emailValidation.error || "Invalid email format." };
    }

    // 验证密码
    if (!password || password.length < 6) {
      return { success: false, error: "密码至少需要 6 个字符" };
    }

    const supabase = await createClient();
    // 规范化邮箱（转小写，去空格）
    const normalizedEmail = normalizeEmail(email);
    // 从邮箱中提取用户名作为显示名称
    const displayName = extractUsernameFromEmail(normalizedEmail);

    // 1. Sign Up
    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: { name: displayName }, // Metadata
        emailRedirectTo: undefined, // 如果不需要重定向，可以设置为 undefined
      },
    });

    if (error) {
      console.error("Signup Error:", error);
      // 处理邮箱已存在的错误
      if (error.message.includes('already registered') || error.message.includes('already exists') || error.message.includes('User already registered')) {
        return { success: false, error: "该邮箱已被注册，请使用其他邮箱或直接登录" };
      }
      return { success: false, error: error.message || "注册失败，请稍后重试" };
    }

    if (!data.user) {
      return { success: false, error: "注册失败，未创建用户" };
    }

    // 2. 如果 Supabase 启用了邮箱确认，使用 admin client 自动确认邮箱
    // 这样用户注册后可以立即登录，无需等待邮箱确认
    if (!data.user.email_confirmed_at) {
      try {
        // 使用 admin client 更新用户邮箱确认状态
        // 注意：这需要 Supabase 项目启用了 admin API 和正确的 SERVICE_ROLE_KEY
        const { data: updatedUser, error: confirmError } = await supabaseAdmin.auth.admin.updateUserById(
          data.user.id,
          { 
            email_confirm: true,
            // 也可以设置 confirmed_at 时间戳
            user_metadata: data.user.user_metadata || {}
          }
        );
        if (confirmError) {
          console.warn("Failed to auto-confirm email:", confirmError);
          console.warn("提示：如果登录失败，请在 Supabase Dashboard 中禁用邮箱确认功能");
          // 即使确认失败，也继续创建 profile
        } else {
          console.log("✅ Email auto-confirmed for user:", updatedUser?.user?.email);
        }
      } catch (confirmErr: any) {
        console.warn("Error auto-confirming email:", confirmErr);
        console.warn("提示：请在 Supabase Dashboard > Authentication > Settings 中禁用邮箱确认");
        // 如果 admin API 不可用，用户需要手动确认邮箱或在 Dashboard 中禁用邮箱确认
      }
    }

    // 3. Determine Role and Credits based on Access Code
    const isSuperUser = accessCode === ADMIN_CODE;
    const role = isSuperUser ? 'admin' : 'user';
    const credits = isSuperUser ? 9999 : 3;

    // 4. Create Profile (Admin Client to bypass RLS)
    const { error: profileError } = await supabaseAdmin.from('profiles').insert({
      id: data.user.id,
      name: displayName,
      role: role,
      credits: credits
    });

    if (profileError) {
        // Fallback: If profile exists (rare race condition), try upsert
        await supabaseAdmin.from('profiles').upsert({
          id: data.user.id,
          name: displayName,
          role: role,
          credits: credits
        });
    }

    revalidatePath('/');
    return { 
      success: true, 
      user: { 
          id: data.user.id, 
          name: displayName, 
          role: role as 'admin'|'user', 
          credits, 
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${displayName}` 
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
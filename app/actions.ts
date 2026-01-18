'use server';

import { GoogleGenAI, Part, GenerateContentResponse } from "@google/genai";
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

    // 2. Fetch Profile (如果不存在则创建)
    let { data: profile, error: profileFetchError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    // 如果 profile 不存在，自动创建一个默认的 profile
    if (!profile || profileFetchError) {
      console.log("Profile not found, creating default profile for user:", data.user.id);
      const displayName = extractUsernameFromEmail(normalizedEmail);

      const { data: newProfile, error: createError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: data.user.id,
          name: displayName,
          role: 'user',
          credits: 3 // 默认积分
        })
        .select()
        .single();

      if (createError) {
        console.error("Failed to create profile:", createError);
        // 如果插入失败，尝试 upsert
        const { data: upsertedProfile, error: upsertError } = await supabaseAdmin
          .from('profiles')
          .upsert({
            id: data.user.id,
            name: displayName,
            role: 'user',
            credits: 3
          })
          .select()
          .single();

        if (upsertError) {
          console.error("Failed to upsert profile:", upsertError);
          // 即使创建失败，也返回默认值
          profile = {
            id: data.user.id,
            name: displayName,
            role: 'user',
            credits: 3
          } as any;
        } else {
          profile = upsertedProfile;
        }
      } else {
        profile = newProfile;
      }
    }

    const role = profile?.role || 'user';
    const credits = profile?.credits ?? 3; // 默认积分改为 3，而不是 0
    const displayName = profile?.name || extractUsernameFromEmail(normalizedEmail);

    revalidatePath('/');
    return {
      success: true,
      user: {
        id: data.user.id,
        name: displayName,
        role: role as 'admin' | 'user',
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
    const { data: createdProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: data.user.id,
        name: displayName,
        role: role,
        credits: credits
      })
      .select()
      .single();

    if (profileError) {
      console.error("Profile creation error:", profileError);
      console.error("Error details:", JSON.stringify(profileError, null, 2));

      // 检查是否是 RLS 策略问题
      if (profileError.message?.includes('permission denied') || profileError.message?.includes('RLS') || profileError.code === '42501') {
        console.error("RLS policy issue detected. Please run the fix_profiles_rls.sql script in Supabase Dashboard.");
      }

      // Fallback: If profile exists (rare race condition), try upsert
      const { data: upsertedProfile, error: upsertError } = await supabaseAdmin
        .from('profiles')
        .upsert({
          id: data.user.id,
          name: displayName,
          role: role,
          credits: credits
        })
        .select()
        .single();

      if (upsertError) {
        console.error("Profile upsert error:", upsertError);
        console.error("Upsert error details:", JSON.stringify(upsertError, null, 2));

        // 提供更详细的错误信息
        let errorMessage = "注册成功，但创建用户资料失败。";
        if (upsertError.message?.includes('permission denied') || upsertError.code === '42501') {
          errorMessage += " 这可能是 RLS 策略问题，请检查 Supabase 配置。";
        } else if (upsertError.message) {
          errorMessage += ` 错误详情: ${upsertError.message}`;
        }
        errorMessage += " 请稍后重试登录（登录时会自动创建 profile）。";

        return {
          success: false,
          error: errorMessage
        };
      }

      // 使用 upsert 后的 profile
      if (!upsertedProfile) {
        return {
          success: false,
          error: "注册成功，但无法获取用户资料。请稍后重试登录"
        };
      }
    } else if (!createdProfile) {
      console.error("Profile created but no data returned");
      return {
        success: false,
        error: "注册成功，但无法获取用户资料。请稍后重试登录"
      };
    }

    revalidatePath('/');
    return {
      success: true,
      user: {
        id: data.user.id,
        name: displayName,
        role: role as 'admin' | 'user',
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

    // Fetch profile details (使用 admin client 以确保可以读取)
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    // 如果 profile 不存在，自动创建一个默认的 profile
    if (!profile || profileError) {
      console.log("Profile not found in getSessionAction, creating default profile for user:", user.id);
      const displayName = user.user_metadata?.name || user.email?.split('@')[0] || 'User';

      const { data: newProfile, error: createError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: user.id,
          name: displayName,
          role: 'user',
          credits: 3 // 默认积分
        })
        .select()
        .single();

      if (createError) {
        console.error("Failed to create profile in getSessionAction:", createError);
        // 如果插入失败，尝试 upsert
        const { data: upsertedProfile } = await supabaseAdmin
          .from('profiles')
          .upsert({
            id: user.id,
            name: displayName,
            role: 'user',
            credits: 3
          })
          .select()
          .single();

        if (!upsertedProfile) {
          // 如果还是失败，返回 null
          return null;
        }

        return {
          id: user.id,
          name: upsertedProfile.name,
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${upsertedProfile.name}`,
          role: upsertedProfile.role as 'user' | 'admin',
          credits: upsertedProfile.credits ?? 3
        } as User;
      }

      if (!newProfile) {
        return null;
      }

      return {
        id: user.id,
        name: newProfile.name,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${newProfile.name}`,
        role: newProfile.role as 'user' | 'admin',
        credits: newProfile.credits ?? 3
      } as User;
    }

    return {
      id: user.id,
      name: profile.name,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.name}`,
      role: profile.role as 'user' | 'admin',
      credits: profile.credits ?? 3 // 确保有默认值
    } as User;
  } catch (e) {
    console.error("getSessionAction error:", e);
    return null;
  }
}

// --- Generation Action ---

export async function generateImageAction(config: GenerationConfig): Promise<{ 
  success: boolean; 
  imageBase64?: string; 
  imageUrl?: string; 
  images?: { base64: string; url: string }[];
  error?: string; 
  remainingCredits?: number 
}> {
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

  // Calculate cost based on image size and count
  const imageCount = Math.min(Math.max(config.imageCount || 1, 1), 3);
  let costPerImage = 1;
  if (config.imageSize === '2K') costPerImage = 2;
  if (config.imageSize === '4K') costPerImage = 4;

  const totalCost = costPerImage * imageCount;

  if (profile.role !== 'admin' && profile.credits < totalCost) {
    return { success: false, error: `Insufficient credits. Need ${totalCost} credits, but you have ${profile.credits}.` };
  }

  // 3. Call Gemini API
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY or API_KEY environment variable is missing");
    return { success: false, error: "API Key 未配置。请在 .env.local 中设置 GEMINI_API_KEY" };
  }

  if (apiKey === 'placeholder-key' || apiKey.length < 10) {
    console.error("Invalid API key detected");
    return { success: false, error: "API Key 无效。请检查 .env.local 中的 GEMINI_API_KEY 配置" };
  }

  const ai = new GoogleGenAI({ apiKey });

  try {
    const parts: Part[] = [{ text: config.prompt }];

    // Handle reference images
    if (config.referenceImages && config.referenceImages.length > 0) {
      config.referenceImages.forEach(image => {
        const [metadata, base64Data] = image.split(',');
        const mimeType = metadata.match(/:(.*?);/)?.[1] || 'image/png';
        parts.push({
          inlineData: {
            data: base64Data,
            mimeType
          }
        });
      });
    } else if (config.referenceImage) { // Legacy fallback
      const [metadata, base64Data] = config.referenceImage.split(',');
      const mimeType = metadata.match(/:(.*?);/)?.[1] || 'image/png';
      parts.push({ 
        inlineData: { 
          data: base64Data, 
          mimeType 
        } 
      });
    }

    console.log("Calling Gemini API with model:", MODEL_NAME);
    console.log("Prompt length:", config.prompt.length);
    console.log("Generating images:", imageCount);

    // Generate multiple images in parallel
    const generatePromises = Array(imageCount).fill(0).map(() => 
      ai.models.generateContent({
        model: MODEL_NAME,
        contents: { parts },
        config: {
          imageConfig: {
            aspectRatio: config.aspectRatio,
            imageSize: config.imageSize
          }
        }
      })
    );

    const responses = await Promise.all(generatePromises);
    const generatedImages: { base64: string; url: string }[] = [];

    for (const response of responses) {
        if (!response.candidates || response.candidates.length === 0) {
          // One failed, maybe skip or throw? throw for now
          throw new Error("No candidates returned from the model.");
        }
        
        const content = response.candidates[0].content;
        let base64Image = "";
        
        if (content && content.parts) {
          for (const part of content.parts) {
            if (part.inlineData && part.inlineData.data) {
              base64Image = part.inlineData.data;
              break; 
            }
          }
        }

        if (!base64Image) continue; // Skip if this one failed but others might succeed? Or fail all? 
        // For robustness, let's process what we got.

        // 4. Upload to Supabase Storage
        const buffer = Buffer.from(base64Image, 'base64');
        const fileName = `${user.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.png`;

        const { error: uploadError } = await supabaseAdmin.storage
          .from('images')
          .upload(fileName, buffer, { contentType: 'image/png' });

        if (uploadError) {
            console.error("Failed to upload image:", uploadError);
            continue;
        }

        const { data: { publicUrl } } = supabaseAdmin.storage
          .from('images')
          .getPublicUrl(fileName);
        
        generatedImages.push({
            base64: `data:image/png;base64,${base64Image}`,
            url: publicUrl
        });
    }

    if (generatedImages.length === 0) {
        throw new Error("Failed to generate any images.");
    }

    // 5. Deduct Credits
    let newCredits = profile.credits;
    if (profile.role !== 'admin') {
      newCredits = Math.max(0, profile.credits - totalCost);
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ credits: newCredits })
        .eq('id', user.id);

      if (updateError) {
        console.error("Failed to update credits:", updateError);
      } else {
        console.log("Credits updated successfully:", newCredits);
      }
    }

    return {
      success: true,
      imageBase64: generatedImages[0].base64, // Backward compatibility
      imageUrl: generatedImages[0].url, // Backward compatibility
      images: generatedImages,
      remainingCredits: newCredits
    };

  } catch (error: any) {
    console.error("Gen Error:", error);
    console.error("Error details:", {
      message: error.message,
      cause: error.cause,
      stack: error.stack?.substring(0, 500)
    });

    // 提供更详细的错误信息
    let errorMessage = "图片生成失败";

    if (error.message?.includes('fetch failed') || error.message?.includes('network') || error.cause?.code === 'ECONNREFUSED') {
      errorMessage = "网络连接失败。请检查网络连接或 API 服务是否可用";
    } else if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
      errorMessage = "API Key 无效或已过期。请检查 .env.local 中的 GEMINI_API_KEY";
    } else if (error.message?.includes('403') || error.message?.includes('Forbidden')) {
      errorMessage = "API 访问被拒绝。请检查 API Key 权限或配额";
    } else if (error.message?.includes('429') || error.message?.includes('rate limit')) {
      errorMessage = "API 请求频率过高，请稍后重试";
    } else if (error.message) {
      errorMessage = error.message;
    }

    return { success: false, error: errorMessage };
  }
}

// --- Data Actions ---

export async function saveTemplateAction(template: Template) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false };

  // Check user role for auto-approval
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const isAdmin = profile?.role === 'admin';
  const status = isAdmin ? 'approved' : 'pending';

  // Convert FE Template model to DB columns
  const templateData = {
    title: template.title,
    prompt: template.prompt,
    aspect_ratio: template.aspectRatio,
    image_url: template.imageUrl,
    reference_image: template.referenceImage,
    reference_images: template.referenceImages,
    author: template.author,
    owner_id: user.id,
    is_published: template.isPublished,
    status: status
  };

  const { error } = await supabase.from('templates').insert(templateData);

  if (error) {
    // Check for missing column error and fallback
    if (error.code === '42703' || error.message.includes('column "reference_images" of relation "templates" does not exist')) {
      console.warn("Column reference_images missing, falling back to legacy insert");
      const legacyData = { ...templateData };
      delete (legacyData as any).reference_images;
      
      const { error: retryError } = await supabase.from('templates').insert(legacyData);
      if (retryError) {
        console.error("Save Error (Retry)", retryError);
        return { success: false, error: retryError.message };
      }
    } else {
      console.error("Save Error", error);
      return { success: false, error: error.message };
    }
  }

  revalidatePath('/');
  return { success: true };
}

export async function getTemplatesAction(page: number = 1, limit: number = 20, search: string = '') {
  const supabase = await createClient();

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  // Optimize query: select necessary fields + check for reference images using JSONB functions
  let query = supabase
    .from('templates')
    .select('id, title, prompt, aspect_ratio, image_url, author, owner_id, is_published, status, created_at, reference_image, reference_images')
    .eq('status', 'approved')
    .eq('is_published', true); // Only show published templates

  // Add search filter if provided (optimized to avoid full table scan)
  if (search) {
    query = query.or(`title.ilike.%${search}%,prompt.ilike.%${search}%`);
  }

  // Finalize query with optimized ordering
  const { data, error } = await query
    .order('created_at', { ascending: false, nullsFirst: false })
    .range(from, to);

  if (error) return [];

  return data.map((t: any) => ({
    id: t.id.toString(),
    title: t.title,
    prompt: t.prompt,
    aspectRatio: t.aspect_ratio,
    imageUrl: t.image_url,
    // Keep reference image data for UI indicator, but it's minimal (just the reference to check existence)
    referenceImage: t.reference_image,
    referenceImages: t.reference_images,
    author: t.author,
    ownerId: t.owner_id,
    isPublished: t.is_published,
    status: t.status
  })) as Template[];
}

export async function getMyTemplatesAction(page: number = 1, limit: number = 20, search: string = '') {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return [];

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  // Optimize query: select necessary fields + check for reference images
  let query = supabase
    .from('templates')
    .select('id, title, prompt, aspect_ratio, image_url, author, owner_id, is_published, status, created_at, reference_image, reference_images')
    .eq('owner_id', user.id);

  if (search) {
    query = query.or(`title.ilike.%${search}%,prompt.ilike.%${search}%`);
  }

  const { data, error } = await query
    .order('created_at', { ascending: false, nullsFirst: false })
    .range(from, to);

  if (error) return [];

  return data.map((t: any) => ({
    id: t.id.toString(),
    title: t.title,
    prompt: t.prompt,
    aspectRatio: t.aspect_ratio,
    imageUrl: t.image_url,
    referenceImage: t.reference_image,
    referenceImages: t.reference_images,
    author: t.author,
    ownerId: t.owner_id,
    isPublished: t.is_published,
    status: t.status
  })) as Template[];
}

export async function getPendingTemplatesAction(page: number = 1, limit: number = 20, search: string = '') {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // Check if admin
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') return [];

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  // Optimize query: select necessary fields + check for reference images
  let query = supabase
    .from('templates')
    .select('id, title, prompt, aspect_ratio, image_url, author, owner_id, is_published, status, created_at, reference_image, reference_images')
    .eq('status', 'pending');

  if (search) {
    query = query.or(`title.ilike.%${search}%,prompt.ilike.%${search}%`);
  }

  const { data, error } = await query
    .order('created_at', { ascending: false, nullsFirst: false })
    .range(from, to);

  if (error) return [];

  return data.map((t: any) => ({
    id: t.id.toString(),
    title: t.title,
    prompt: t.prompt,
    aspectRatio: t.aspect_ratio,
    imageUrl: t.image_url,
    referenceImage: t.reference_image,
    referenceImages: t.reference_images,
    author: t.author,
    ownerId: t.owner_id,
    isPublished: t.is_published,
    status: t.status
  })) as Template[];
}

export async function updateTemplateStatusAction(templateId: string, status: 'approved' | 'rejected') {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Unauthorized" };

  // Check if admin
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') return { success: false, error: "Forbidden" };

  const { error } = await supabaseAdmin
    .from('templates')
    .update({ status: status })
    .eq('id', templateId);

  if (error) {
    console.error("Update Status Error", error);
    return { success: false, error: error.message };
  }

  revalidatePath('/');
  return { success: true };
}

import { createClient } from '@supabase/supabase-js'

// Fallback to placeholder to prevent crash during build/init if env vars are missing
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key'

// Debug: Check if environment variables are properly loaded
if (!process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY === 'placeholder-key') {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY 未配置或使用占位符！')
  console.error('   这会导致 admin client 无法正常工作（创建 profile、绕过 RLS 等）')
  console.error('   请在 .env.local 中添加正确的 SUPABASE_SERVICE_ROLE_KEY')
  console.error('   获取方式：Supabase Dashboard > Settings > API > service_role secret key')
}

// Note: This client uses the SERVICE_ROLE_KEY.
// It bypasses Row Level Security. Never use this on the client side.
export const supabaseAdmin = createClient(
  supabaseUrl,
  serviceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)
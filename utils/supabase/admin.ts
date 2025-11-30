import { createClient } from '@supabase/supabase-js'

// Fallback to placeholder to prevent crash during build/init if env vars are missing
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
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
import { createClient } from '@supabase/supabase-js'

// Fallback to placeholder to prevent crash during build/init if env vars are missing
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lqdgjjjyxrfhlfxktxde.supabase.co'
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxxZGdqamp5eHJmaGxmeGt0eGRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0NjA1MDcsImV4cCI6MjA4MDAzNjUwN30.V4Fz-DG5nXfgZ0vAOUjlT3IhXZOh03UVn9y6aReeVbA'

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
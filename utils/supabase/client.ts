import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
    // Fallback to placeholder to prevent crash during build/init if env vars are missing
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

    return createBrowserClient(supabaseUrl, supabaseAnonKey)
}


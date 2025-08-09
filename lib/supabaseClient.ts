import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Singleton client instance - always use this shared instance
// to avoid multiple GoTrueClient warnings
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Ensure consistent storage key
    storageKey: 'supabase.auth.token',
    // Enable auto refresh for better UX
    autoRefreshToken: true,
    // Persist session across browser sessions
    persistSession: true,
    // Detect session in URL
    detectSessionInUrl: true
  },
  global: {
    headers: {
      'Connection': 'keep-alive'
    }
  },
  db: {
    schema: 'public'
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
}) 
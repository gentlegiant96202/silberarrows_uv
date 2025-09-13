import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Singleton client instance - always use this shared instance
// to avoid multiple GoTrueClient warnings
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Ensure consistent storage key for PWA
    storageKey: 'silberarrows.auth.token',
    // Enable auto refresh for better UX
    autoRefreshToken: true,
    // Persist session across browser sessions and PWA launches
    persistSession: true,
    // Detect session in URL
    detectSessionInUrl: true,
    // Enhanced PWA session handling
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    // Longer session refresh for PWA stability
    debug: false
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
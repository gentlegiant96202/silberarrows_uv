import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Custom cookie storage for Supabase auth (used by middleware)
const cookieStorage = typeof window !== 'undefined' ? {
  getItem: (key: string) => {
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === key) {
        const decoded = decodeURIComponent(value);
        console.log('🍪 Cookie GET:', key, '- Found:', !!decoded);
        return decoded;
      }
    }
    console.log('🍪 Cookie GET:', key, '- Not found');
    return null;
  },
  setItem: (key: string, value: string) => {
    console.log('🍪 Cookie SET:', key, '- Value length:', value.length);
    // Set cookie with 7 day expiry for auth persistence
    const maxAge = 60 * 60 * 24 * 7; // 7 days
    document.cookie = `${key}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`;
    
    // Verify it was set
    const verify = document.cookie.includes(key);
    console.log('🍪 Cookie SET verification:', key, '- Success:', verify);
  },
  removeItem: (key: string) => {
    console.log('🍪 Cookie REMOVE:', key);
    document.cookie = `${key}=; path=/; max-age=0`;
  }
} : undefined;

// Singleton client instance - always use this shared instance
// to avoid multiple GoTrueClient warnings
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Use custom cookie storage for auth (so middleware can access it)
    storage: cookieStorage,
    // Ensure consistent storage key for PWA and middleware
    storageKey: 'sb-auth-token',
    // Enable auto refresh for better UX
    autoRefreshToken: true,
    // Persist session across browser sessions and PWA launches
    persistSession: true,
    // Detect session in URL
    detectSessionInUrl: true,
    // Enhanced PWA session handling
    debug: false,
    // Flow type - implicit for client-side
    flowType: 'implicit'
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
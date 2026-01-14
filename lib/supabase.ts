import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Client-side Supabase client (with RLS)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Server-side Supabase client (bypasses RLS for authenticated server actions)
// Use this in Server Actions where you've already authenticated via Clerk
export function getServerSupabase() {
  // Check if service role key is available
  const serviceRoleKey = process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

  if (serviceRoleKey) {
    // Use service role key to bypass RLS (safe because we authenticate via Clerk first)
    return createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  }

  // Fallback to anon key (will require RLS policies)
  console.warn('SUPABASE_SERVICE_ROLE_KEY not found. Using anon key. RLS policies required.')
  return createClient(supabaseUrl, supabaseAnonKey)
}

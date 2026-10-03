import { createClient } from '@supabase/supabase-js'

// Accepts either SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL
const supabaseUrl = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Server-side client (full access via service role)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

// Public client (anon key — for settings read)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

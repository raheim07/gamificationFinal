import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

let supabaseClient = null

export function isSupabaseConfigured() {
  return Boolean(supabaseUrl && supabaseKey)
}

export function getSupabaseClient() {
  if (!isSupabaseConfigured()) {
    throw new Error(
      "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your environment."
    )
  }

  if (!supabaseClient) {
    supabaseClient = createClient(supabaseUrl, supabaseKey)
  }

  return supabaseClient
}


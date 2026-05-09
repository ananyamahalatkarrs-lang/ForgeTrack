import { createClient } from '@supabase/supabase-js';

// Hardcoded fallbacks in case .env.local is not picked up
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://mcgextaacccapjgdgqzz.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_IVUwgZvB7mrryVM8SZJzdg_S7IStrc8";

if (!import.meta.env.VITE_SUPABASE_URL) {
  console.warn("Supabase URL missing from env, using hardcoded fallback.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

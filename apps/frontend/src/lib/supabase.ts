import { createClient } from '@supabase/supabase-js';

// TODO: Replace with your Supabase credentials
// Get these from: https://supabase.com/dashboard/project/_/settings/api
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Type for waitlist table
export interface WaitlistEntry {
  id?: string;
  email: string;
  created_at?: string;
}

import { createClient } from '@supabase/supabase-js';

// Supabase publishable keys are safe to expose in browser code. Environment
// variables remain preferred, while these fallbacks keep deployed builds usable.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://htxbrxxtchomuhshdqtw.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_InT6fS6X6aZ33A383GxhBQ_Mn88-aO3';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

// Keep the app buildable before project credentials are added. Features that
// require Supabase must check isSupabaseConfigured before using this client.
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey)
  : null;

export async function sendEmailVerificationCode(email) {
  if (!supabase) throw new Error('Supabase email verification is not configured.');

  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim().toLowerCase(),
    options: { shouldCreateUser: true }
  });
  if (error) throw error;
}

export async function verifyEmailVerificationCode(email, code) {
  if (!supabase) throw new Error('Supabase email verification is not configured.');

  const { data, error } = await supabase.auth.verifyOtp({
    email: email.trim().toLowerCase(),
    token: code.trim(),
    type: 'email'
  });
  if (error) throw error;
  if (!data.session?.access_token) throw new Error('Supabase did not return a verified session. Request a new code.');
  return data.session.access_token;
}

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

export async function signInWithGoogle() {
  if (!supabase) throw new Error('Supabase Google sign-in is not configured.');

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/` }
  });
  if (error) throw error;
}

export async function getSupabaseSession() {
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function signOutOfGoogle() {
  if (supabase) await supabase.auth.signOut();
}

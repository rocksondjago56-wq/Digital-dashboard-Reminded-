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

const getGoogleRedirectUrl = () => {
  const publicAppUrl = import.meta.env.VITE_PUBLIC_APP_URL?.replace(/\/$/, '');
  if (publicAppUrl) return `${publicAppUrl}/`;

  const isLocalHost = ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
  return isLocalHost
    ? 'https://digital-dashboard-reminded.vercel.app/'
    : `${window.location.origin}/`;
};

export async function signInWithGoogle(profile = null) {
  if (!supabase) throw new Error('Supabase Google sign-in is not configured.');

  if (profile) sessionStorage.setItem('ttu_registration_profile', JSON.stringify(profile));

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: getGoogleRedirectUrl(),
      data: profile ? { registration_profile: profile } : undefined
    }
  });
  if (error) throw error;
}

export async function getSupabaseSession() {
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function saveSupabaseProfile(profile) {
  if (!supabase) return;
  const { error } = await supabase.auth.updateUser({ data: profile });
  if (error) throw error;
}

export async function signOutOfGoogle() {
  if (supabase) await supabase.auth.signOut();
}

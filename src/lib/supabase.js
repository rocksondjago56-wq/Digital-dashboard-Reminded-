import { createClient } from '@supabase/supabase-js';

// Supabase publishable keys are safe to expose in browser code. Environment
// variables remain preferred, while these fallbacks keep deployed builds usable.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://htxbrxxtchomuhshdqtw.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  || import.meta.env.VITE_SUPABASE_ANON_KEY
  || 'sb_publishable_InT6fS6X6aZ33A383GxhBQ_Mn88-aO3';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

// Keep the app buildable before project credentials are added. Features that
// require Supabase must check isSupabaseConfigured before using this client.
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey)
  : null;

const LIVE_PORTAL_URL = 'https://digital-dashboard-reminded.vercel.app';

const toProfileMetadata = (profile) => ({
  requested_role: profile?.role || 'student',
  requested_courses: profile?.courses || [],
  name: profile?.fullName || '',
  registration_email: profile?.email || '',
  phone: profile?.phone || '',
  program: profile?.program || '',
  year: profile?.year || '',
  certificate: profile?.certificate || '',
  student_id: profile?.indexNumber || '',
  staff_id: profile?.lecturerId || profile?.staffId || '',
  designation: profile?.position || ''
});

const getGoogleRedirectUrl = () => {
  const publicAppUrl = import.meta.env.VITE_PUBLIC_APP_URL?.replace(/\/$/, '');
  const isValidPublicUrl = publicAppUrl
    && /^https:\/\//i.test(publicAppUrl)
    && !/https:\/\/(localhost|127\.0\.0\.1|\[::1\])/i.test(publicAppUrl)
    && !/your-portal\.vercel\.app/i.test(publicAppUrl);
  if (isValidPublicUrl) return `${publicAppUrl}/`;

  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/`;
  }
  return `${LIVE_PORTAL_URL}/`;
};

export async function signInWithGoogle(profile = null) {
  if (!supabase) throw new Error('Supabase Google sign-in is not configured.');

  if (profile) sessionStorage.setItem('ttu_registration_profile', JSON.stringify(profile));
  const { accessCode: _accessCode, ...safeProfile } = profile || {};

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: getGoogleRedirectUrl(),
      data: profile?.role ? toProfileMetadata(safeProfile) : undefined
    }
  });
  if (error) throw error;
}

export async function signUpWithEmailPassword(profile, password) {
  if (!supabase) throw new Error('Supabase authentication is not configured.');
  const { accessCode: _accessCode, ...safeProfile } = profile;
  const { data, error } = await supabase.auth.signUp({
    email: profile.email.trim(),
    password,
    options: { data: toProfileMetadata(safeProfile) }
  });
  if (error) throw error;
  return data;
}

export async function signInWithEmailPassword(email, password) {
  if (!supabase) throw new Error('Supabase authentication is not configured.');
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw error;
  return data;
}

export async function getSupabaseSession() {
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  let session = data?.session || null;
  if (session?.expires_at && (session.expires_at * 1000) < Date.now()) {
    try {
      const { data: refreshData, error: refreshErr } = await supabase.auth.refreshSession();
      if (!refreshErr && refreshData?.session) {
        session = refreshData.session;
      }
    } catch {
      // refresh failure fallback
    }
  }
  return session;
}

export async function saveSupabaseProfile(profile) {
  if (!supabase) return;
  const { error } = await supabase.auth.updateUser({ data: profile });
  if (error) throw error;
}

export async function signOutOfGoogle() {
  if (supabase) {
    try {
      await supabase.auth.signOut();
    } catch {
      // ignore sign-out errors
    }
  }
}

export async function sendPasswordReset(email) {
  if (!supabase) throw new Error('Supabase authentication is not configured.');
  const trimmed = String(email || '').trim();
  if (!trimmed) throw new Error('Please enter a valid email address.');

  const redirectUrl = (typeof window !== 'undefined' && window.location?.origin)
    ? `${window.location.origin}/`
    : `${LIVE_PORTAL_URL}/`;

  const { data, error } = await supabase.auth.resetPasswordForEmail(trimmed, {
    redirectTo: redirectUrl
  });
  if (error) throw error;
  return data;
}

export async function updateUserPassword(newPassword) {
  if (!supabase) throw new Error('Supabase authentication is not configured.');
  if (!newPassword || newPassword.length < 6) {
    throw new Error('Password must be at least 6 characters long.');
  }

  const { data, error } = await supabase.auth.updateUser({
    password: newPassword
  });
  if (error) throw error;
  return data;
}

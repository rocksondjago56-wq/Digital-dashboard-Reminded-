const getSupabaseConfig = () => ({
  url: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  publishableKey: process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY
});

export const isSupabaseAuthConfigured = () => {
  const { url, publishableKey } = getSupabaseConfig();
  return Boolean(url && publishableKey);
};

export async function getVerifiedSupabaseUser(accessToken) {
  if (!isSupabaseAuthConfigured()) {
    throw new Error('Supabase email verification is not configured on the server.');
  }
  if (!accessToken) {
    throw new Error('Verify the email code before activating the account.');
  }

  const { url, publishableKey } = getSupabaseConfig();
  const response = await fetch(`${url}/auth/v1/user`, {
    headers: {
      apikey: publishableKey,
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    throw new Error('The Supabase verification session is invalid or has expired. Request a new code.');
  }

  return response.json();
}

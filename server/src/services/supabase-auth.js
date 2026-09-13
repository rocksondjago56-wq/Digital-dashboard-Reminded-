const getSupabaseConfig = () => ({
  url: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://htxbrxxtchomuhshdqtw.supabase.co',
  publishableKey: process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_InT6fS6X6aZ33A383GxhBQ_Mn88-aO3'
});

export const isSupabaseAuthConfigured = () => {
  const { url, publishableKey } = getSupabaseConfig();
  return Boolean(url && publishableKey);
};

export async function getVerifiedSupabaseUser(accessToken) {
  if (!isSupabaseAuthConfigured()) {
    throw new Error('Supabase authentication is not configured on the server.');
  }
  if (!accessToken) {
    throw new Error('Google authentication is required before creating a portal session.');
  }

  const { url, publishableKey } = getSupabaseConfig();
  const response = await fetch(`${url}/auth/v1/user`, {
    headers: {
      apikey: publishableKey,
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    throw new Error('The Google authentication session is invalid or has expired. Please continue with Google again.');
  }

  return response.json();
}

export async function getSupabaseProfile(accessToken, email) {
  const { url, publishableKey } = getSupabaseConfig();
  const response = await fetch(`${url}/rest/v1/profiles?email=eq.${encodeURIComponent(email)}&select=id,email,role,name,profile_picture_url`, {
    headers: { apikey: publishableKey, Authorization: `Bearer ${accessToken}` }
  });
  if (!response.ok) throw new Error('Could not retrieve the TTU profile for this Google account.');
  const [profile] = await response.json();
  return profile || null;
}

export async function updateSupabaseProfileRole(profileId, role) {
  const { url } = getSupabaseConfig();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) throw new Error('Supabase service role configuration is required to activate this registration code.');
  const response = await fetch(`${url}/rest/v1/profiles?id=eq.${encodeURIComponent(profileId)}`, {
    method: 'PATCH',
    headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify({ role })
  });
  if (!response.ok) throw new Error('Could not activate the Supabase profile role.');
  const [profile] = await response.json();
  return profile;
}

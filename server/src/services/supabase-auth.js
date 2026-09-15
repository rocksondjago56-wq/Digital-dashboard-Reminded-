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
    throw new Error('A valid Supabase session is required before creating a portal session.');
  }

  const { url, publishableKey } = getSupabaseConfig();
  const response = await fetch(`${url}/auth/v1/user`, {
    headers: {
      apikey: publishableKey,
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    throw new Error('The Supabase authentication session is invalid or has expired. Please sign in again.');
  }

  return response.json();
}

export async function getSupabaseProfile(accessToken, email) {
  try {
    const { url, publishableKey } = getSupabaseConfig();
    const response = await fetch(`${url}/rest/v1/profiles?email=eq.${encodeURIComponent(email)}&select=id,email,role,name,profile_picture_url`, {
      headers: { apikey: publishableKey, Authorization: `Bearer ${accessToken}` }
    });
    if (!response.ok) return null;
    const [profile] = await response.json();
    return profile || null;
  } catch (error) {
    console.warn('[supabase-auth] getSupabaseProfile warning:', error.message);
    return null;
  }
}

/**
 * Supabase normally creates this row from the auth trigger. This server-side
 * fallback covers cases where the trigger was not installed yet or service-role
 * key is being initialized.
 */
export async function ensureSupabaseProfile(accessToken, googleUser) {
  const user = (googleUser && typeof googleUser === 'object') ? (googleUser.user || googleUser) : {};
  const email = user?.email?.trim().toLowerCase() || '';
  if (!email) {
    return { id: user?.id || 'unknown', email: '', role: null, name: 'TTU Member', profile_picture_url: null };
  }
  const existing = await getSupabaseProfile(accessToken, email);
  if (existing) return existing;

  const { url } = getSupabaseConfig();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const metadata = user.user_metadata || {};
  const fallbackProfile = {
    id: user.id || 'unknown',
    email,
    name: metadata.full_name || metadata.name || email.split('@')[0],
    role: null,
    profile_picture_url: metadata.avatar_url || metadata.picture || null
  };

  if (!serviceRoleKey) {
    console.warn('[supabase-auth] SUPABASE_SERVICE_ROLE_KEY is not configured on Render. Using session fallback profile.');
    return fallbackProfile;
  }

  try {
    const response = await fetch(`${url}/rest/v1/profiles`, {
      method: 'POST',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=representation'
      },
      body: JSON.stringify({
        id: googleUser.id,
        email,
        name: metadata.full_name || metadata.name || email.split('@')[0],
        profile_picture_url: metadata.avatar_url || metadata.picture || null
      })
    });
    if (response.ok) {
      const [profile] = await response.json();
      if (profile) return profile;
    }
  } catch (err) {
    console.warn('[supabase-auth] Could not create profile with service role key:', err.message);
  }

  return await getSupabaseProfile(accessToken, email) || fallbackProfile;
}

export async function updateSupabaseProfileRole(profileId, role) {
  return updateSupabaseProfile(profileId, { role });
}

export async function updateSupabaseProfile(profileId, updates) {
  const { url } = getSupabaseConfig();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    console.warn('[supabase-auth] SUPABASE_SERVICE_ROLE_KEY not set on Render. Role updated in application session.');
    return { id: profileId, ...updates };
  }
  try {
    const response = await fetch(`${url}/rest/v1/profiles?id=eq.${encodeURIComponent(profileId)}`, {
      method: 'PATCH',
      headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify(updates)
    });
    if (response.ok) {
      const [profile] = await response.json();
      if (profile) return profile;
    }
  } catch (err) {
    console.warn('[supabase-auth] Could not update profile with service role key:', err.message);
  }
  return { id: profileId, ...updates };
}

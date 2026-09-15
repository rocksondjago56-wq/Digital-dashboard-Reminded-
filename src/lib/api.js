/**
 * API Client for TTU Dashboard Backend.
 * Wraps fetch() with JWT token handling and error management.
 * 
 * Role-based Google sign-in requires the backend so the Supabase profile role
 * is always verified before any dashboard is opened.
 */

const API_BASE = import.meta.env.VITE_API_BASE?.trim().replace(/\/$/, '');
const TOKEN_KEY = 'ttu_api_token';

export const isApiConfigured = Boolean(API_BASE);

if (import.meta.env.DEV) {
  console.info('[TTU API] VITE_API_BASE:', API_BASE || '(not set)');
}

/**
 * Get the stored JWT token.
 */
export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Store a JWT token.
 */
export function setToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

/**
 * Remove the stored JWT token.
 */
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

/**
 * Check if the backend API is reachable.
 * Returns true if the health endpoint responds.
 */
export async function isApiAvailable() {
  if (!isApiConfigured) return false;

  try {
    const response = await fetch(`${API_BASE}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(15000)
    });
    const health = response.ok ? await response.json() : null;
    const available = health?.status === 'ok';
    if (import.meta.env.DEV) console.info('[TTU API] Health check:', { apiBase: API_BASE, available, health });
    return available;
  } catch (error) {
    if (import.meta.env.DEV) console.error('[TTU API] Health check failed:', { apiBase: API_BASE, error });
    return false;
  }
}

/**
 * Make an authenticated API request.
 * Automatically includes the JWT token if available.
 */
async function request(endpoint, options = {}) {
  if (!isApiConfigured) {
    throw new Error('VITE_API_BASE is not configured.');
  }

  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers
  };

  let response;
  try {
    response = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
  } catch (error) {
    if (import.meta.env.DEV) console.error('[TTU API] Request failed:', { apiBase: API_BASE, endpoint, error });
    throw error;
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.error || `Request failed with status ${response.status}`);
    if (import.meta.env.DEV) console.error('[TTU API] Request failed:', { apiBase: API_BASE, endpoint, status: response.status, error });
    throw error;
  }

  return data;
}

/**
 * API methods organized by resource.
 */
export const api = {
  // --- Auth ---
  auth: {
    login: (identifier, password) =>
      request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ identifier, password })
      }),

    me: () => request('/auth/me'),
    googleSignIn: (accessToken, profile) => request('/auth/google-signin', { method: 'POST', body: JSON.stringify({ accessToken, profile }) })
  },

  // --- Deadlines ---
  deadlines: {
    list: () => request('/deadlines'),

    create: (deadline) =>
      request('/deadlines', {
        method: 'POST',
        body: JSON.stringify(deadline)
      }),

    update: (id, data) =>
      request(`/deadlines/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      }),

    delete: (id) =>
      request(`/deadlines/${id}`, {
        method: 'DELETE'
      }),

    toggleComplete: (id) =>
      request(`/deadlines/${id}/toggle-complete`, {
        method: 'POST'
      })
  },

  // --- Announcements ---
  announcements: {
    list: () => request('/announcements'),

    create: (announcement) =>
      request('/announcements', {
        method: 'POST',
        body: JSON.stringify(announcement)
      }),

    update: (id, data) =>
      request(`/announcements/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      }),

    delete: (id) =>
      request(`/announcements/${id}`, {
        method: 'DELETE'
      })
  },

  // --- Events ---
  events: {
    list: () => request('/events'),

    create: (event) =>
      request('/events', {
        method: 'POST',
        body: JSON.stringify(event)
      }),

    update: (id, data) =>
      request(`/events/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      }),

    delete: (id) =>
      request(`/events/${id}`, {
        method: 'DELETE'
      })
  },

  // --- Users ---
  users: {
    list: () => request('/users'),

    roleManagementAccess: () => request('/users/role-management-access'),

    createRegistrationCode: (role, expiresInHours) => request('/users/registration-codes', { method: 'POST', body: JSON.stringify({ role, expiresInHours }) }),

    updateRole: (id, role) =>
      request(`/users/${id}/role`, {
        method: 'PUT',
        body: JSON.stringify({ role })
      }),

    updateProfilePic: (id, profilePic) =>
      request(`/users/${id}/profile-pic`, {
        method: 'PUT',
        body: JSON.stringify({ profilePic })
      }),
    provision: (identity) => request('/users/provision', { method: 'POST', body: JSON.stringify(identity) }),
    delete: (id) =>
      request(`/users/${id}`, {
        method: 'DELETE'
      })
  },

  // --- Timetable ---
  timetable: {
    list: () => request('/timetable'),

    create: (slot) =>
      request('/timetable', {
        method: 'POST',
        body: JSON.stringify(slot)
      }),

    update: (id, data) =>
      request(`/timetable/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      }),

    delete: (id) =>
      request(`/timetable/${id}`, {
        method: 'DELETE'
      }),

    // Class Groups
    listClassGroups: () => request('/timetable/class-groups'),

    saveClassGroup: (group) =>
      request('/timetable/class-groups', {
        method: 'POST',
        body: JSON.stringify(group)
      }),

    deleteClassGroup: (id) =>
      request(`/timetable/class-groups/${id}`, {
        method: 'DELETE'
      })
  }
};

export default api;

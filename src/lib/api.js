/**
 * API Client for TTU Dashboard Backend.
 * Wraps fetch() with JWT token handling and error management.
 * 
 * When the backend is not running, requests will fail gracefully
 * and the app will fall back to localStorage mode.
 */

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001/api';
const TOKEN_KEY = 'ttu_api_token';

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
  try {
    const response = await fetch(`${API_BASE}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(2000) // 2 second timeout
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Make an authenticated API request.
 * Automatically includes the JWT token if available.
 */
async function request(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `Request failed with status ${response.status}`);
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

    signup: (data) =>
      request('/auth/signup', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    me: () => request('/auth/me'),
    requestVerification: (identifier) => request('/auth/request-verification', { method: 'POST', body: JSON.stringify({ identifier }) }),
    activateAccount: (identifier, code, password) => request('/auth/activate-account', { method: 'POST', body: JSON.stringify({ identifier, code, password }) })
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

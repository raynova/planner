const API_BASE = '/api';

async function handleResponse(response) {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }
  return data;
}

export const api = {
  // Auth
  login: async (email) => {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email })
    });
    return handleResponse(response);
  },

  verifyToken: async (token) => {
    const response = await fetch(`${API_BASE}/auth/verify?token=${token}`, {
      credentials: 'include'
    });
    return handleResponse(response);
  },

  me: async () => {
    const response = await fetch(`${API_BASE}/auth/me`, {
      credentials: 'include'
    });
    return handleResponse(response);
  },

  logout: async () => {
    const response = await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      credentials: 'include'
    });
    return handleResponse(response);
  },

  // Timelines
  getTimelines: async () => {
    const response = await fetch(`${API_BASE}/timelines`, {
      credentials: 'include'
    });
    return handleResponse(response);
  },

  getTimeline: async (id) => {
    const response = await fetch(`${API_BASE}/timelines/${id}`, {
      credentials: 'include'
    });
    return handleResponse(response);
  },

  createTimeline: async (data) => {
    const response = await fetch(`${API_BASE}/timelines`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  },

  updateTimeline: async (id, data) => {
    const response = await fetch(`${API_BASE}/timelines/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  },

  deleteTimeline: async (id) => {
    const response = await fetch(`${API_BASE}/timelines/${id}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    return handleResponse(response);
  }
};

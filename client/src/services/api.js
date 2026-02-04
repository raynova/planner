const API_BASE = '/api';

async function handleResponse(response) {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }
  return data;
}

export const api = {
  // Timelines (no auth required)
  getTimelines: async () => {
    const response = await fetch(`${API_BASE}/timelines`);
    return handleResponse(response);
  },

  getTimeline: async (id) => {
    const response = await fetch(`${API_BASE}/timelines/${id}`);
    return handleResponse(response);
  },

  createTimeline: async (data) => {
    const response = await fetch(`${API_BASE}/timelines`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  },

  updateTimeline: async (id, data) => {
    const response = await fetch(`${API_BASE}/timelines/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  },

  deleteTimeline: async (id) => {
    const response = await fetch(`${API_BASE}/timelines/${id}`, {
      method: 'DELETE'
    });
    return handleResponse(response);
  }
};

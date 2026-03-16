const API_BASE = 'http://localhost:8000/api';

export const fetchAPI = async (endpoint: string, options = {}) => {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  return res.json();
};
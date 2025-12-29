const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export const API_CONFIG = {
  baseUrl: API_BASE_URL.replace(/\/$/, ''),
  userId: Number(import.meta.env.VITE_USER_ID || 1),
  courseId: Number(import.meta.env.VITE_COURSE_ID || 1),
};

export async function fetchJson(path, options = {}) {
  const apiKey = import.meta.env.VITE_API_KEY;
  const headers = {
    ...(options.headers || {}),
    ...(apiKey ? { "x-api-key": apiKey } : {}),
  };
  const res = await fetch(`${API_CONFIG.baseUrl}${path}`, { ...options, headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return res.json();
}

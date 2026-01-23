const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://backend-logic-production.up.railway.app';
const USER_STORAGE_KEY = 'logicapp_current_user';

export const API_CONFIG = {
  baseUrl: API_BASE_URL.replace(/\/$/, ''),
  userId: Number(import.meta.env.VITE_USER_ID || 1),
  courseId: Number(import.meta.env.VITE_COURSE_ID || 1),
};

const getStorage = () => {
  if (typeof window === 'undefined') {
    return null;
  }
  return window.localStorage;
};

export function getStoredUser() {
  const storage = getStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(USER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.warn('Failed to read stored user', error);
    return null;
  }
}

export function setStoredUser(user) {
  const storage = getStorage();
  if (!storage || !user) return;
  try {
    storage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  } catch (error) {
    console.warn('Failed to store user', error);
  }
}

export function clearStoredUser() {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.removeItem(USER_STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to clear stored user', error);
  }
}

export function getActiveUserId() {
  const storedUser = getStoredUser();
  return storedUser?.id ?? API_CONFIG.userId;
}

export async function fetchJson(path, options = {}) {
  const apiKey = import.meta.env.VITE_API_KEY;
  const headers = {
    ...(options.headers || {}),
    // api key is still required for backend requests
    ...(apiKey ? { "x-api-key": apiKey } : {}),
  };
  const res = await fetch(`${API_CONFIG.baseUrl}${path}`, {
    ...options,
    headers,
    credentials: options.credentials || 'include',
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return res.json();
}

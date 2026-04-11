const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://backend-logic-production.up.railway.app';
const USER_STORAGE_KEY = 'logicapp_current_user';
let unauthorizedHandler = null;

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

export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler;
}

export function getActiveUserId() {
  const storedUser = getStoredUser();
  return storedUser?.id ?? API_CONFIG.userId;
}

export async function fetchJson(path, options = {}) {
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/sandbox')) {
    throw new Error(`Sandbox API access disabled for ${path}`);
  }
  const apiKey = import.meta.env.VITE_API_KEY;
  const fetchOptions = { ...options };
  const timeoutMs = Number(
    fetchOptions.timeoutMs
      ?? import.meta.env.VITE_API_TIMEOUT_MS
      ?? 20000
  );
  delete fetchOptions.timeoutMs;
  const userSignal = fetchOptions.signal;
  delete fetchOptions.signal;
  const controller = new AbortController();
  const timeoutId = Number.isFinite(timeoutMs) && timeoutMs > 0
    ? setTimeout(() => controller.abort('timeout'), timeoutMs)
    : null;
  const signal = userSignal
    ? AbortSignal.any([controller.signal, userSignal])
    : controller.signal;
  const headers = {
    ...(fetchOptions.headers || {}),
    // api key is still required for backend requests
    ...(apiKey ? { "x-api-key": apiKey } : {}),
  };
  let res;
  try {
    res = await fetch(`${API_CONFIG.baseUrl}${path}`, {
      ...fetchOptions,
      signal,
      headers,
      credentials: fetchOptions.credentials || 'include',
    });
  } catch (error) {
    if (error?.name === 'AbortError') {
      if (controller.signal.reason === 'timeout') {
        throw new Error(`Request timed out after ${timeoutMs}ms`);
      }
      throw new Error('Request was canceled');
    }
    throw error;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
  if (!res.ok) {
    if (res.status === 401) {
      try {
        clearStoredUser();
        if (typeof unauthorizedHandler === 'function') {
          unauthorizedHandler();
        } else if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      } catch (error) {
        console.warn('Failed to handle unauthorized response', error);
      }
    }
    const text = await res.text();
    let message = text;
    try {
      message = JSON.parse(text)?.message || text;
    } catch {
      // text wasn't json; keep raw message
    }
    throw new Error(message || `Request failed: ${res.status}`);
  }
  return res.json();
}

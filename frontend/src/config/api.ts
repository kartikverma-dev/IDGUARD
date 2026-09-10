import axios from 'axios';

/**
 * Resolves the active backend API base URL with priority:
 * 1. User configured backendUrl in localStorage (from Settings page)
 * 2. Vite environment variable: VITE_API_BASE_URL (configured in Vercel)
 * 3. Default fallback: http://localhost:8000
 */
export const getBackendUrl = (): string => {
  try {
    const saved = localStorage.getItem('idguard_settings');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.backendUrl && typeof parsed.backendUrl === 'string' && parsed.backendUrl.trim()) {
        return parsed.backendUrl.trim().replace(/\/+$/, '');
      }
    }
  } catch {
    // ignore parse errors
  }

  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
    return envUrl.trim().replace(/\/+$/, '');
  }

  return 'http://localhost:8000';
};

/**
 * Returns a fully-qualified URL for a given API endpoint path.
 * e.g., getApiUrl('/api/health') => "https://api.my-idguard.com/api/health"
 */
export const getApiUrl = (path: string): string => {
  const base = getBackendUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
};

/**
 * Pre-configured Axios instance that dynamically routes all requests
 * to the active backend URL.
 */
export const apiClient = axios.create({
  timeout: 30000,
});

apiClient.interceptors.request.use((config) => {
  if (config.url && !config.url.startsWith('http://') && !config.url.startsWith('https://')) {
    config.url = getApiUrl(config.url);
  }
  return config;
});

export default apiClient;

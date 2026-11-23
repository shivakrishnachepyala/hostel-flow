import axios from 'axios';

// In-memory CSRF token storage (no sessionStorage / localStorage persistence)
let inMemoryCsrfToken: string | null = null;

export const setCsrfToken = (token: string | null) => {
  inMemoryCsrfToken = token;
};

export const getCsrfToken = () => inMemoryCsrfToken;

// Backwards compatibility stubs for legacy imports (no sessionStorage usage)
export const setAuthToken = (_token: string | null) => {};
export const getAuthToken = () => null;

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^|;\\s*)' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[2]) : null;
}

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  withCredentials: true,
});

// Request interceptor: attach anti-CSRF token and request headers
apiClient.interceptors.request.use((config) => {
  if (config.headers) {
    config.headers['X-Requested-With'] = 'XMLHttpRequest';
    config.headers['ngrok-skip-browser-warning'] = 'true';

    const csrf = inMemoryCsrfToken || getCookie('csrf_token');
    if (csrf) {
      config.headers['X-CSRF-Token'] = csrf;
    }
  }
  return config;
});

// Response interceptor to format errors gracefully
apiClient.interceptors.response.use(
  (response) => {
    // If backend returns a refreshed csrf_token, keep it in memory
    if (response.data?.csrf_token) {
      setCsrfToken(response.data.csrf_token);
    }
    return response;
  },
  (error) => {
    const errorMsg =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      'An unexpected error occurred with the hostel backend';
    return Promise.reject(new Error(errorMsg));
  }
);

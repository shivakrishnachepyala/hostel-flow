import axios from 'axios';

// In-memory token storage (with resilient sessionStorage fallback across page reloads)
let inMemoryWardenToken: string | null = null;
let inMemoryStudentToken: string | null = null;
let inMemoryCsrfToken: string | null = null;

if (typeof window !== 'undefined') {
  try {
    inMemoryWardenToken = sessionStorage.getItem('hostelflow_auth_token');
    inMemoryStudentToken = sessionStorage.getItem('hostelflow_student_token');
    inMemoryCsrfToken = sessionStorage.getItem('hostelflow_csrf_token');
  } catch {
    // Graceful fallback if storage is restricted in embedded webviews
  }
}

export const setAuthToken = (token: string | null) => {
  inMemoryWardenToken = token;
  if (typeof window !== 'undefined') {
    try {
      if (token) {
        sessionStorage.setItem('hostelflow_auth_token', token);
      } else {
        sessionStorage.removeItem('hostelflow_auth_token');
      }
    } catch {
      // ignore
    }
  }
};

export const getAuthToken = () => inMemoryWardenToken;

export const setStudentAuthToken = (token: string | null) => {
  inMemoryStudentToken = token;
  if (typeof window !== 'undefined') {
    try {
      if (token) {
        sessionStorage.setItem('hostelflow_student_token', token);
      } else {
        sessionStorage.removeItem('hostelflow_student_token');
      }
    } catch {
      // ignore
    }
  }
};

export const getStudentAuthToken = () => inMemoryStudentToken;

export const setCsrfToken = (token: string | null) => {
  inMemoryCsrfToken = token;
  if (typeof window !== 'undefined') {
    try {
      if (token) {
        sessionStorage.setItem('hostelflow_csrf_token', token);
      } else {
        sessionStorage.removeItem('hostelflow_csrf_token');
      }
    } catch {
      // ignore
    }
  }
};

export const getCsrfToken = () => inMemoryCsrfToken;

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

// Request interceptor: attach dual-channel Authorization bearer & anti-CSRF token
apiClient.interceptors.request.use((config) => {
  if (config.headers) {
    config.headers['X-Requested-With'] = 'XMLHttpRequest';
    config.headers['ngrok-skip-browser-warning'] = 'true';

    // Route-aware dual-channel token selection:
    // When accessing /student endpoints, preferentially attach student JWT
    // For management, warden, allocations, and administrative endpoints, attach warden JWT
    const url = config.url || '';
    const isStudentRoute = url.startsWith('/student') || url.startsWith('student');
    const token = isStudentRoute
      ? (inMemoryStudentToken || inMemoryWardenToken)
      : (inMemoryWardenToken || inMemoryStudentToken);

    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    const csrf = inMemoryCsrfToken || getCookie('csrf_token') || getCookie('student_csrf_token');
    if (csrf) {
      config.headers['X-CSRF-Token'] = csrf;
    }
  }
  return config;
});

// Response interceptor to format errors gracefully and sync updated tokens
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
    const err = new Error(errorMsg) as any;
    err.response = error.response;
    err.status = error.response?.status;
    return Promise.reject(err);
  }
);

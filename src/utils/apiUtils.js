import axios from 'axios';
import { Cookies } from 'react-cookie';

const cookies = new Cookies();

// Get backend URL utility function
const getBackendUrl = (path = '') => {
  const baseUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
  const cleanBaseUrl = baseUrl.replace(/\/+$/, '');
  const cleanPath = path.replace(/^\/+/, '');
  return cleanPath ? `${cleanBaseUrl}/${cleanPath}` : cleanBaseUrl;
};

// Create axios instance with default config
const api = axios.create({
  baseURL: getBackendUrl(),
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add token to auth header if it exists
    const token = cookies.get('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add CSRF token if it exists
    const csrfToken = cookies.get('XSRF-TOKEN');
    if (csrfToken) {
      config.headers['X-XSRF-TOKEN'] = csrfToken;
    }

    // Ensure the path starts with /api
    if (!config.url.startsWith('/api')) {
      config.url = `/api${config.url}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    // Handle successful responses
    if (response.data.token) {
      cookies.set('token', response.data.token, {
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7200 // 2 hours
      });

      // If we have user data in the response, update the user cookie
      if (response.data.user) {
        cookies.set('user', response.data.user, {
          path: '/',
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 7200 // 2 hours
        });
      }
    }
    return response;
  },
  async (error) => {
    if (error.response?.status === 401) {
      // Clear auth cookies on 401
      cookies.remove('token', { path: '/' });
      cookies.remove('user', { path: '/' });
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Cookie management functions
const setCookie = (name, value, options = {}) => {
  cookies.set(name, value, {
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    ...options
  });
};

const getCookie = (name) => {
  return cookies.get(name);
};

const removeCookie = (name) => {
  cookies.remove(name, { path: '/' });
};

export {
  getBackendUrl,
  api,
  setCookie,
  getCookie,
  removeCookie
};

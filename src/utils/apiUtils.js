import axios from 'axios';
import { Cookies } from 'react-cookie';

const cookies = new Cookies();

// Cookie utilities
export const setCookie = (name, value, options = {}) => {
  const defaultOptions = {
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: name === 'refreshToken' ? 30 * 24 * 60 * 60 : 2 * 60 * 60 // 30 days for refresh token, 2 hours for others
  };
  
  const finalOptions = {
    ...defaultOptions,
    ...options,
    httpOnly: false // Ensure PWA can access cookies
  };

  cookies.set(name, value, finalOptions);
};

export const getCookie = (name) => {
  return cookies.get(name);
};

export const removeCookie = (name) => {
  cookies.remove(name, { path: '/' });
};

// Get backend URL from environment or default
export const getBackendUrl = () => {
  return process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
};

// Create axios instance with enhanced retry logic
export const api = axios.create({
  baseURL: getBackendUrl(),
  withCredentials: true,
  timeout: 10000, // 10 seconds
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor with enhanced error handling
api.interceptors.request.use(
  (config) => {
    const token = getCookie('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add CSRF token if available
    const csrfToken = getCookie('XSRF-TOKEN');
    if (csrfToken) {
      config.headers['X-CSRF-Token'] = csrfToken;
    }

    // Add /api prefix if not present and not an absolute URL
    if (!config.url.startsWith('/api/') && !config.url.startsWith('http')) {
      config.url = `/api/${config.url.startsWith('/') ? config.url.slice(1) : config.url}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor with enhanced token refresh
let isRefreshing = false;
let refreshSubscribers = [];

api.interceptors.response.use(
  (response) => {
    // Debug response
    console.debug('API Response:', {
      url: response.config.url,
      status: response.status,
      hasToken: !!response.data.token,
      hasUser: !!response.data.user,
      userData: response.data.user ? {
        id: response.data.user.id,
        company: response.data.user.company,
        unitName: response.data.user.unitName,
        workCycles: response.data.user.workCycles?.length
      } : null,
      cookies: document.cookie
    });

    // For login endpoint
    if (response.config.url.includes('/auth/login') || response.config.url.includes('/auth/google-login')) {
      if (response.data.token) {
        // Set token cookie
        setCookie('token', response.data.token, {
          path: '/',
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax'
        });
      }
      if (response.data.refreshToken) {
        // Set refresh token cookie
        setCookie('refreshToken', response.data.refreshToken, {
          path: '/',
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax'
        });
      }
      if (response.data.user) {
        // Set user data cookie
        setCookie('user', JSON.stringify(response.data.user), {
          path: '/',
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax'
        });
      }
    }

    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Debug error
    console.error('API Error:', {
      url: error.config?.url,
      status: error.response?.status,
      message: error.message
    });

    // If error is not 401 or request already retried, reject
    if (error.response?.status !== 401 || originalRequest._retry) {
      if (error.response?.status === 401) {
        removeCookie('token');
        removeCookie('refreshToken');
        removeCookie('user');
      }
      return Promise.reject(error);
    }

    if (!isRefreshing) {
      isRefreshing = true;
      const refreshToken = getCookie('refreshToken');

      try {
        const response = await axios.post(`${getBackendUrl()}/api/auth/refresh-token`, 
          { refreshToken },
          { 
            withCredentials: true,
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );

        const { token, refreshToken: newRefreshToken } = response.data;

        // Update cookies with new tokens
        setCookie('token', token);
        if (newRefreshToken) {
          setCookie('refreshToken', newRefreshToken);
        }

        // Update authorization header
        originalRequest.headers.Authorization = `Bearer ${token}`;
        
        // Notify subscribers and reset state
        refreshSubscribers.forEach(callback => callback(token));
        refreshSubscribers = [];
        isRefreshing = false;

        // Retry original request
        return api(originalRequest);
      } catch (error) {
        isRefreshing = false;
        refreshSubscribers = [];
        removeCookie('token');
        removeCookie('refreshToken');
        removeCookie('user');
        
        // Only redirect if not already on login page
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    }

    // If we're already refreshing, wait for the token
    return new Promise(resolve => {
      refreshSubscribers.push(token => {
        originalRequest.headers.Authorization = `Bearer ${token}`;
        resolve(api(originalRequest));
      });
    });
  }
);

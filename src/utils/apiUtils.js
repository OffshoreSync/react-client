import axios from 'axios';
import { Cookies } from 'react-cookie';

const cookies = new Cookies();

// Cookie utilities
export const setCookie = (name, value, options = {}) => {
  const defaultOptions = {
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production'
  };
  const cookieOptions = { ...defaultOptions, ...options };
  cookies.set(name, value, cookieOptions);
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

// Create axios instance
export const api = axios.create({
  baseURL: getBackendUrl(),
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Flag to track if we're currently refreshing the token
let isRefreshing = false;
// Store of callbacks to be called after token refresh
let refreshSubscribers = [];

// Subscribe callback to be called after token refresh
const subscribeTokenRefresh = (callback) => {
  refreshSubscribers.push(callback);
};

// Call all stored callbacks after token refresh
const onTokenRefreshed = (token) => {
  refreshSubscribers.forEach((callback) => callback(token));
  refreshSubscribers = [];
};

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = getCookie('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add CSRF token
    const csrfToken = getCookie('XSRF-TOKEN');
    if (csrfToken) {
      config.headers['X-CSRF-Token'] = csrfToken;
    }

    // Add /api prefix if not present and not an absolute URL
    if (!config.url.startsWith('/api') && !config.url.startsWith('http')) {
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
    if (response.config.url.includes('/auth/login')) {
      // Set token cookie
      if (response.data.token) {
        setCookie('token', response.data.token, {
          path: '/',
          sameSite: 'lax',
          secure: process.env.NODE_ENV === 'production',
          maxAge: 2 * 60 * 60 // 2 hours in seconds
        });
      }

      // Set refresh token if present
      if (response.data.refreshToken) {
        setCookie('refreshToken', response.data.refreshToken, {
          path: '/',
          sameSite: 'lax',
          secure: process.env.NODE_ENV === 'production',
          httpOnly: true,
          maxAge: 7 * 24 * 60 * 60 // 7 days in seconds
        });
      }

      // Set user data cookie
      if (response.data.user) {
        // Ensure all required fields are present
        const userData = {
          ...response.data.user,
          company: response.data.user.company || null,
          unitName: response.data.user.unitName || null,
          workingRegime: response.data.user.workingRegime || {
            onDutyDays: 28,
            offDutyDays: 28
          },
          workSchedule: response.data.user.workSchedule || {},
          workCycles: response.data.user.workCycles || []
        };

        setCookie('user', userData, {
          path: '/',
          sameSite: 'lax',
          secure: process.env.NODE_ENV === 'production',
          maxAge: 2 * 60 * 60 // 2 hours in seconds
        });

        // Debug user data
        console.debug('User Data Set:', {
          hasCompany: !!userData.company,
          hasUnitName: !!userData.unitName,
          company: userData.company,
          unitName: userData.unitName,
          workingRegime: userData.workingRegime,
          workSchedule: userData.workSchedule
        });
      }
    }

    // For profile endpoint
    if (response.config.url.includes('/auth/profile')) {
      const currentUser = getCookie('user') || {};
      const updatedUser = {
        ...currentUser,
        ...response.data.user,
        // Preserve existing values if new ones are null
        company: response.data.user.company || currentUser.company || null,
        unitName: response.data.user.unitName || currentUser.unitName || null,
        workingRegime: response.data.user.workingRegime || currentUser.workingRegime || {
          onDutyDays: 28,
          offDutyDays: 28
        },
        workSchedule: response.data.user.workSchedule || currentUser.workSchedule || {},
        workCycles: response.data.user.workCycles || currentUser.workCycles || []
      };

      // Set new token if provided
      if (response.data.token) {
        setCookie('token', response.data.token, {
          path: '/',
          sameSite: 'lax',
          secure: process.env.NODE_ENV === 'production',
          maxAge: 2 * 60 * 60 // 2 hours in seconds
        });
      }

      // Set updated user data
      setCookie('user', updatedUser, {
        path: '/',
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 2 * 60 * 60 // 2 hours in seconds
      });

      // Debug profile data
      console.debug('Profile Data Updated:', {
        hasCompany: !!updatedUser.company,
        hasUnitName: !!updatedUser.unitName,
        company: updatedUser.company,
        unitName: updatedUser.unitName,
        workingRegime: updatedUser.workingRegime,
        workSchedule: updatedUser.workSchedule,
        workCycles: updatedUser.workCycles?.length
      });
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

    // If we're already refreshing, wait for the token and retry
    if (isRefreshing) {
      try {
        const token = await new Promise(resolve => {
          subscribeTokenRefresh(token => {
            resolve(token);
          });
        });
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return api(originalRequest);
      } catch (err) {
        return Promise.reject(err);
      }
    }

    // Start refreshing process
    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const refreshToken = getCookie('refreshToken');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await api.post('/api/auth/refresh-token', {
        refreshToken
      });

      const { token, refreshToken: newRefreshToken } = response.data;

      // Store new tokens with same options as login
      setCookie('token', token, {
        path: '/',
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 2 * 60 * 60 // 2 hours in seconds
      });

      if (newRefreshToken) {
        setCookie('refreshToken', newRefreshToken, {
          path: '/',
          sameSite: 'lax',
          secure: process.env.NODE_ENV === 'production',
          httpOnly: true,
          maxAge: 7 * 24 * 60 * 60 // 7 days in seconds
        });
      }

      // Update authorization header
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      originalRequest.headers.Authorization = `Bearer ${token}`;

      // Notify subscribers and reset refresh state
      onTokenRefreshed(token);
      isRefreshing = false;

      // Retry original request
      return api(originalRequest);
    } catch (refreshError) {
      // Clear tokens and notify subscribers of failure
      removeCookie('token');
      removeCookie('refreshToken');
      removeCookie('user');
      
      isRefreshing = false;
      refreshSubscribers = [];

      // Redirect to login if available
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }

      return Promise.reject(refreshError);
    }
  }
);

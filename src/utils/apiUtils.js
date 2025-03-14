import axios from 'axios';
import { Cookies } from 'react-cookie';

const cookies = new Cookies();

// Cookie utilities
export const setCookie = (name, value, options = {}) => {
  const defaultOptions = {
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    sameSite: name === 'refreshToken' ? 'lax' : 'strict',
    maxAge: name === 'refreshToken' ? 30 * 24 * 60 * 60 : 2 * 60 * 60 // 30 days for refresh token, 2 hours for others
  };
  
  const finalOptions = {
    ...defaultOptions,
    ...options,
    httpOnly: false // Ensure PWA can access cookies
  };

  // Set the primary cookie
  cookies.set(name, value, finalOptions);

  // For tokens, also set a lax version for PWA compatibility
  if (name === 'token' || name === 'refreshToken') {
    const pwaOptions = {
      ...finalOptions,
      sameSite: 'lax',
      // Add PWA suffix to distinguish the cookie
      name: `${name}_pwa`
    };
    cookies.set(name + '_pwa', value, pwaOptions);
  }
};

export const getCookie = (name) => {
  // Try getting the regular cookie first
  const value = cookies.get(name);
  if (value) return value;

  // If not found and it's a token, try the PWA version
  if (name === 'token' || name === 'refreshToken') {
    return cookies.get(name + '_pwa');
  }
  return null;
};

export const removeCookie = (name) => {
  cookies.remove(name, { path: '/' });
  // Also remove PWA version if it's a token
  if (name === 'token' || name === 'refreshToken') {
    cookies.remove(name + '_pwa', { path: '/' });
  }
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
      console.log('%c🔑 Session Validation - Access Token Used', 'color: #4CAF50; font-weight: bold', {
        tokenType: 'access',
        source: token === getCookie('token_pwa') ? 'pwa_cookie' : 'regular_cookie',
        urlPath: config.url,
        timestamp: new Date().toISOString()
      });
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
    console.log('%c📦 API Response:', 'color: #03A9F4; font-weight: bold', {
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
        setCookie('token', response.data.token);
      }
      if (response.data.refreshToken) {
        // Set refresh token cookie
        setCookie('refreshToken', response.data.refreshToken);
      }
      if (response.data.user) {
        // Set user data cookie
        setCookie('user', JSON.stringify(response.data.user));
      }
    }

    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Debug error
    console.error('%c🚨 API Error:', 'color: #FF0000; font-weight: bold', {
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
      
      console.log('%c🔄 Session Validation - Refresh Token Used', 'color: #2196F3; font-weight: bold', {
        tokenType: 'refresh',
        source: refreshToken === getCookie('refreshToken_pwa') ? 'pwa_cookie' : 'regular_cookie',
        timestamp: new Date().toISOString()
      });

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

        // Update cookies with new tokens - this will set both regular and PWA versions
        setCookie('token', token);
        if (newRefreshToken) {
          setCookie('refreshToken', newRefreshToken);
        }

        console.log('%c✨ Session Validation - Tokens Refreshed', 'color: #9C27B0; font-weight: bold', {
          accessTokenUpdated: true,
          refreshTokenUpdated: !!newRefreshToken,
          timestamp: new Date().toISOString(),
          source: {
            token: getCookie('token') === getCookie('token_pwa') ? 'pwa_cookie' : 'regular_cookie',
            refreshToken: newRefreshToken && getCookie('refreshToken') === getCookie('refreshToken_pwa') ? 'pwa_cookie' : 'regular_cookie'
          }
        });

        // Update authorization header - try PWA version if regular token is not available
        const currentToken = getCookie('token') || getCookie('token_pwa');
        originalRequest.headers.Authorization = `Bearer ${currentToken}`;
        
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

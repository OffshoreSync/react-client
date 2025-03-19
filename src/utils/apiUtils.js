import axios from 'axios';
import { Cookies } from 'react-cookie';

const cookies = new Cookies();
let isRefreshing = false;
let refreshSubscribers = [];

// Cookie utilities
export const getCookie = (name) => {
  // Try both regular and PWA versions
  const regularCookie = cookies.get(name);
  const pwaCookie = cookies.get(`${name}_pwa`);
  return regularCookie || pwaCookie;
};

export const setCookie = (name, value, options = {}) => {
  const isProd = process.env.NODE_ENV === 'production';
  
  // Calculate expiration time
  let expires;
  if (name.includes('refreshToken')) {
    expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  } else if (name === 'token') {
    expires = new Date(Date.now() + 60 * 1000); // 1 minute
  }

  const defaultOptions = {
    path: '/',
    sameSite: isProd ? 'none' : 'lax', // Changed to 'none' for both in production
    secure: isProd,
    expires
  };

  const cookieOptions = { ...defaultOptions, ...options };

  // Debug cookie settings
  console.debug('Setting cookie:', {
    name,
    isProd,
    expires: expires?.toISOString(),
    sameSite: cookieOptions.sameSite,
    secure: cookieOptions.secure
  });

  // Set both regular and PWA versions with same settings in production
  if (isProd) {
    // In production, both regular and PWA cookies use same secure settings
    cookies.set(name, value, cookieOptions);
    cookies.set(`${name}_pwa`, value, cookieOptions);
  } else {
    // In development, keep original behavior
    cookies.set(name, value, cookieOptions);
    cookies.set(`${name}_pwa`, value, {
      ...cookieOptions,
      sameSite: 'none',
      secure: true
    });
  }
};

export const removeCookie = (name) => {
  const isProd = process.env.NODE_ENV === 'production';
  const options = {
    path: '/',
    sameSite: isProd ? 'none' : 'lax',
    secure: isProd
  };

  // Debug cookie removal
  console.debug('Removing cookie:', {
    name,
    isProd,
    sameSite: options.sameSite,
    secure: options.secure
  });

  // Use same settings for both in production
  cookies.remove(name, options);
  cookies.remove(`${name}_pwa`, options);
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

let tokenRefreshPromise = null;

// Function to get a valid token, refreshing if necessary
const getValidToken = async () => {
  const token = getCookie('token');
  if (!token) return null;

  try {
    const tokenData = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Math.floor(Date.now() / 1000);
    
    // Log token status
    console.log('%c🔑 Token Status Check', 'color: #4CAF50; font-weight: bold', {
      tokenType: 'access',
      source: token === getCookie('token_pwa') ? 'pwa_cookie' : 'regular_cookie',
      expiresAt: new Date(tokenData.exp * 1000).toISOString(),
      currentTime: new Date(currentTime * 1000).toISOString(),
      hasExpired: currentTime >= tokenData.exp,
      isRefreshing: !!tokenRefreshPromise
    });

    // If token is expired or about to expire (within 5 seconds)
    if (currentTime >= tokenData.exp - 5) {
      // If refresh is already in progress, wait for it
      if (tokenRefreshPromise) {
        console.log('%c🔄 Waiting for ongoing refresh', 'color: #FF9800; font-weight: bold');
        return tokenRefreshPromise;
      }

      // Start new refresh
      console.log('%c🔄 Starting token refresh', 'color: #2196F3; font-weight: bold');
      tokenRefreshPromise = refreshTokenAndRetry();
      
      try {
        const newToken = await tokenRefreshPromise;
        return newToken;
      } finally {
        tokenRefreshPromise = null;
      }
    }

    return token;
  } catch (error) {
    console.log('%c🔑 Token Validation Failed', 'color: #FF5722; font-weight: bold', {
      error: error.message,
      timestamp: new Date().toISOString()
    });
    return null;
  }
};

// Request interceptor with enhanced error handling
api.interceptors.request.use(
  async (config) => {
    // Skip token validation for refresh token requests
    if (config.url.includes('/auth/refresh-token')) {
      return config;
    }

    const token = await getValidToken();
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

// Function to refresh token and retry original request
const refreshTokenAndRetry = async (originalRequest = null) => {
  if (isRefreshing) {
    // If refresh is already in progress, wait for it to complete
    return new Promise((resolve) => {
      refreshSubscribers.push((token) => {
        if (originalRequest) {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          resolve(api(originalRequest));
        } else {
          resolve(token);
        }
      });
    });
  }

  isRefreshing = true;
  const refreshToken = getCookie('refreshToken') || getCookie('refreshToken_pwa');

  if (!refreshToken) {
    isRefreshing = false;
    removeCookie('token');
    removeCookie('refreshToken');
    removeCookie('user');
    window.dispatchEvent(new CustomEvent('auth-state-changed', { detail: { isAuthenticated: false } }));
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
    return Promise.reject(new Error('No refresh token available'));
  }

  try {
    console.log('%c🔄 Token Refresh Attempt', 'color: #2196F3; font-weight: bold', {
      tokenType: 'refresh',
      source: refreshToken === getCookie('refreshToken_pwa') ? 'pwa_cookie' : 'regular_cookie',
      timestamp: new Date().toISOString()
    });

    const response = await axios.post(`${getBackendUrl()}/api/auth/refresh-token`,
      { refreshToken },
      {
        withCredentials: true,
        headers: { 'Content-Type': 'application/json' }
      }
    );

    const { token, refreshToken: newRefreshToken, user } = response.data;

    if (!token) {
      throw new Error('No token received from refresh endpoint');
    }

    // Update cookies with new tokens
    setCookie('token', token);
    if (newRefreshToken) {
      setCookie('refreshToken', newRefreshToken);
    }

    // Update user data if provided
    if (user) {
      setCookie('user', JSON.stringify(user));
      window.dispatchEvent(new CustomEvent('auth-state-changed', { detail: { isAuthenticated: true, user } }));
    }

    // Notify subscribers and clear the queue
    refreshSubscribers.forEach((callback) => callback(token));
    refreshSubscribers = [];

    // Update the original request with new token
    originalRequest.headers.Authorization = `Bearer ${token}`;

    console.log('%c✨ Token Refresh Success', 'color: #9C27B0; font-weight: bold', {
      accessTokenUpdated: true,
      refreshTokenUpdated: !!newRefreshToken,
      userUpdated: !!user,
      timestamp: new Date().toISOString()
    });

    isRefreshing = false;
    return api(originalRequest);
  } catch (error) {
    isRefreshing = false;
    refreshSubscribers = [];

    // Clear all auth cookies and redirect to login
    removeCookie('token');
    removeCookie('refreshToken');
    removeCookie('user');
    window.dispatchEvent(new CustomEvent('auth-state-changed', { detail: { isAuthenticated: false } }));

    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
};

// Response interceptor with enhanced token refresh
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

    // Handle token expiration from request interceptor
    if (error.message === 'Token expired' && !originalRequest._retry) {
      originalRequest._retry = true;
      return refreshTokenAndRetry(originalRequest);
    }

    // If error is not 401 or request already retried, reject
    if (!error.response || error.response.status !== 401 || originalRequest._retry || originalRequest.url.includes('/auth/refresh-token')) {
      if (error.response?.status === 401) {
        removeCookie('token');
        removeCookie('refreshToken');
        removeCookie('user');
        window.dispatchEvent(new CustomEvent('auth-state-changed', { detail: { isAuthenticated: false } }));
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
      return Promise.reject(error);
    }

    // Mark this request as retried
    originalRequest._retry = true;

    if (!isRefreshing) {
      isRefreshing = true;
      // Try both regular and PWA refresh tokens
      const refreshToken = getCookie('refreshToken') || getCookie('refreshToken_pwa');
      
      if (!refreshToken) {
        isRefreshing = false;
        removeCookie('token');
        removeCookie('refreshToken');
        removeCookie('user');
        window.dispatchEvent(new CustomEvent('auth-state-changed', { detail: { isAuthenticated: false } }));
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        return Promise.reject(new Error('No refresh token available'));
      }

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

        if (!response.data.token) {
          throw new Error('No token received from refresh endpoint');
        }

        const { token, refreshToken: newRefreshToken, user } = response.data;

        // Update cookies with new tokens
        setCookie('token', token);
        if (newRefreshToken) {
          setCookie('refreshToken', newRefreshToken);
        }

        // Update user data if provided
        if (user) {
          setCookie('user', JSON.stringify(user));
          window.dispatchEvent(new CustomEvent('auth-state-changed', { detail: { isAuthenticated: true, user } }));
        }

        // Log successful token refresh
        console.log('%c✨ Session Validation - Tokens Refreshed', 'color: #9C27B0; font-weight: bold', {
          accessTokenUpdated: true,
          refreshTokenUpdated: !!newRefreshToken,
          userUpdated: !!user,
          timestamp: new Date().toISOString()
        });

        // Update authorization header for the original request
        originalRequest.headers.Authorization = `Bearer ${token}`;
        
        // Reset refresh state
        isRefreshing = false;
        refreshSubscribers = [];

        // Retry the original request with new token
        return axios(originalRequest);

      } catch (refreshError) {
        console.error('%c❌ Token Refresh Failed:', 'color: #FF5722; font-weight: bold', {
          error: refreshError.message,
          timestamp: new Date().toISOString()
        });

        isRefreshing = false;
        refreshSubscribers = [];
        
        // Clear all auth cookies
        removeCookie('token');
        removeCookie('refreshToken');
        removeCookie('user');
        
        // Notify about auth state change
        window.dispatchEvent(new CustomEvent('auth-state-changed', { detail: { isAuthenticated: false } }));
        
        // Redirect to login if not already there
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }

    // If we're already refreshing, wait for the new token
    return new Promise(resolve => {
      refreshSubscribers.push(token => {
        originalRequest.headers.Authorization = `Bearer ${token}`;
        resolve(axios(originalRequest));
      });
    });
  }
);

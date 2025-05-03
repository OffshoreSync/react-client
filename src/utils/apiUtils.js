import axios from 'axios';
import { Cookies } from 'react-cookie';

// Centralized auth clear utility
export function clearAuthAndRedirect(redirectTo = '/login') {
  removeCookie('token');
  removeCookie('refreshToken');
  removeCookie('user');
  removeCookie('XSRF-TOKEN');
  window.dispatchEvent(new CustomEvent('auth-state-changed', { detail: { isAuthenticated: false } }));
  if (window.location.pathname !== redirectTo) {
    window.location.href = redirectTo;
  }
}


const cookies = new Cookies();
let isRefreshing = false;
let refreshSubscribers = [];

// --- Track offline status via BroadcastChannel ---
let isOffline = !navigator.onLine; // fallback for initial load

// Update isOffline when navigator.onLine changes
window.addEventListener('online', () => {
  console.log('🌐 Device is now online');
  isOffline = false;
});

window.addEventListener('offline', () => {
  console.log('📵 Device is now offline');
  isOffline = true;
});

// Also use BroadcastChannel for cross-tab communication
try {
  const statusChannel = new BroadcastChannel('offshoresync-status');
  statusChannel.addEventListener('message', (event) => {
    if (event.data && typeof event.data.type === 'string') {
      if (event.data.type === 'offline') {
        isOffline = true;
        console.log('📵 Received offline status from another tab');
      }
      if (event.data.type === 'online') {
        isOffline = false;
        console.log('🌐 Received online status from another tab');
      }
    }
  });
} catch (err) {
  // BroadcastChannel may not be supported
  console.warn('BroadcastChannel unavailable for offline status:', err);
}

export const setCookie = (name, value, options = {}) => {
  try {
    const defaultOptions = {
      path: '/',
      sameSite: 'strict',
      secure: window.location.protocol === 'https:',
      expires: new Date(Date.now() + 60 * 1000) // 1 minute
    };

    const mergedOptions = { ...defaultOptions, ...options };
    cookies.set(name, value, mergedOptions);

    // Also set a PWA-specific cookie for offline access
    cookies.set(`${name}_pwa`, value, { ...mergedOptions, expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) });
    
    // CRITICAL: Also store in localStorage as a fallback
    try {
      localStorage.setItem(name, value);
      console.log(`%c💾 Stored ${name} in localStorage as fallback`, 'color: #4CAF50; font-weight: bold');
    } catch (storageError) {
      console.error(`Error storing ${name} in localStorage:`, storageError);
    }
  } catch (error) {
    console.error(`Error setting cookie ${name}:`, error);
    // If cookie fails, try localStorage
    try {
      localStorage.setItem(name, value);
      console.log(`%c💾 Stored ${name} in localStorage after cookie failure`, 'color: #FF9800; font-weight: bold');
    } catch (storageError) {
      console.error(`Error storing ${name} in localStorage:`, storageError);
    }
  }
};

export const getCookie = (name) => {
  try {
    // First try cookies
    const cookieValue = cookies.get(name) || cookies.get(`${name}_pwa`);
    if (cookieValue) {
      return cookieValue;
    }
    
    // If cookies fail, try localStorage
    const localStorageValue = localStorage.getItem(name);
    if (localStorageValue) {
      console.log(`%c💾 Retrieved ${name} from localStorage fallback`, 'color: #2196F3; font-weight: bold');
      return localStorageValue;
    }
    
    return null;
  } catch (error) {
    console.error(`Error getting cookie/storage ${name}:`, error);
    // Last resort, try localStorage directly
    try {
      const localStorageValue = localStorage.getItem(name);
      if (localStorageValue) {
        console.log(`%c💾 Retrieved ${name} from localStorage after cookie failure`, 'color: #FF9800; font-weight: bold');
        return localStorageValue;
      }
    } catch (storageError) {
      console.error(`Error retrieving ${name} from localStorage:`, storageError);
    }
    return null;
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

// Public API utility for endpoints that don't require authentication or CSRF tokens
export const publicApi = {
  get: async (url, config = {}) => {
    try {
      const backendUrl = getBackendUrl();
      // Ensure URL starts with /api/ if it's not an absolute URL
      const apiUrl = url.startsWith('http') ? url : 
        url.startsWith('/api/') ? `${backendUrl}${url}` : 
        `${backendUrl}/api/${url.startsWith('/') ? url.slice(1) : url}`;
      
      console.log('Making public API GET request:', { url: apiUrl });
      return await axios.get(apiUrl, {
        ...config,
        withCredentials: true
      });
    } catch (error) {
      console.error('Public API GET request failed:', error);
      throw error;
    }
  },
  
  post: async (url, data = {}, config = {}) => {
    try {
      const backendUrl = getBackendUrl();
      // Ensure URL starts with /api/ if it's not an absolute URL
      const apiUrl = url.startsWith('http') ? url : 
        url.startsWith('/api/') ? `${backendUrl}${url}` : 
        `${backendUrl}/api/${url.startsWith('/') ? url.slice(1) : url}`;
      
      console.log('Making public API POST request:', { url: apiUrl });
      return await axios.post(apiUrl, data, {
        ...config,
        withCredentials: true
      });
    } catch (error) {
      console.error('Public API POST request failed:', error);
      throw error;
    }
  }
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
export const getValidToken = async () => {
  // Check if we're offline first
  if (isOffline) {
    console.log('%c📵 Device is offline - skipping token validation in getValidToken', 'color: #FF9800; font-weight: bold');
    // When offline, just return whatever token we have without validation
    const token = getCookie('token') || getCookie('token_pwa');
    if (token) {
      return token;
    }
    return null;
  }
  
  const token = getCookie('token');
  if (!token) {
    console.warn('%c⚠️ No token found in cookies', 'color: #FF9800; font-weight: bold', {
      timestamp: new Date().toISOString(),
      cookieNames: Object.keys(cookies.getAll())
    });
    return null;
  }

  try {
    const tokenData = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Math.floor(Date.now() / 1000);
    const timeUntilExpiry = tokenData.exp - currentTime;
    
    // Log token status
    console.log('%c🔑 Token Status Check', 'color: #4CAF50; font-weight: bold', {
      tokenType: 'access',
      source: token === getCookie('token_pwa') ? 'pwa_cookie' : 'regular_cookie',
      expiresAt: new Date(tokenData.exp * 1000).toISOString(),
      currentTime: new Date(currentTime * 1000).toISOString(),
      timeUntilExpiry: `${timeUntilExpiry} seconds`,
      hasExpired: tokenData.exp <= currentTime,
      isRefreshing: !!tokenRefreshPromise,
      tokenFirstChars: token.substring(0, 15) + '...'
    });

    // Calculate token lifetime and refresh threshold (20% of total lifetime)
    const tokenLifetime = tokenData.exp - tokenData.iat;
    const refreshThreshold = Math.max(60, Math.floor(tokenLifetime * 0.2)); // At least 60 seconds or 20% of lifetime
    
    // If token is expired or about to expire (within threshold), refresh it
    if (tokenData.exp <= currentTime + refreshThreshold) {
      console.log('%c🔄 Token needs refresh', 'color: #FF9800; font-weight: bold', {
        reason: tokenData.exp <= currentTime ? 'expired' : 'expiring soon',
        timeUntilExpiry: `${timeUntilExpiry} seconds`,
        refreshThreshold: `${refreshThreshold} seconds`
      });
      
      // If a refresh is already in progress, wait for it
      if (tokenRefreshPromise) {
        console.log('%c🔄 Using existing token refresh promise', 'color: #2196F3; font-weight: bold');
        return tokenRefreshPromise;
      }

      // Start new refresh
      console.log('%c🔄 Starting token refresh', 'color: #2196F3; font-weight: bold');
      tokenRefreshPromise = refreshTokenAndRetry();
      
      try {
        const newToken = await tokenRefreshPromise;
        if (!newToken) {
          console.error('%c❌ Token refresh failed - no new token returned', 'color: #FF5722; font-weight: bold');
          return null;
        }
        console.log('%c✅ Token refresh succeeded', 'color: #4CAF50; font-weight: bold', {
          newTokenFirstChars: newToken.substring(0, 15) + '...'
        });
        return newToken;
      } catch (refreshError) {
        console.error('%c❌ Token refresh error', 'color: #FF5722; font-weight: bold', {
          error: refreshError.message
        });
        return null;
      } finally {
        tokenRefreshPromise = null;
      }
    }

    return token;
  } catch (error) {
    console.error('%c🔑 Token Validation Failed', 'color: #FF5722; font-weight: bold', {
      error: error.message,
      timestamp: new Date().toISOString(),
      token: token ? (token.substring(0, 15) + '...') : 'null'
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
      
      // Debug log for outgoing requests with token
      console.debug('%c🔒 Request with Token:', 'color: #4CAF50; font-weight: bold', {
        url: config.url,
        tokenFirstChars: token.substring(0, 10) + '...',
        timestamp: new Date().toISOString()
      });
    } else {
      console.warn('%c⚠️ Request without Token:', 'color: #FFC107; font-weight: bold', {
        url: config.url,
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
      console.debug('Standardizing API URL path:', {
        from: config.url,
        to: `/api/${config.url.startsWith('/') ? config.url.slice(1) : config.url}`
      });
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
  // Check if we're already refreshing to avoid multiple refresh requests
  if (isRefreshing) {
    console.log('%c🔄 Token refresh already in progress', 'color: #FF9800; font-weight: bold', {
      hasOriginalRequest: !!originalRequest,
      url: originalRequest?.url,
      subscribersCount: refreshSubscribers.length
    });
    
    // If refresh is already in progress, wait for it to complete
    return new Promise((resolve, reject) => {
      refreshSubscribers.push((token, error) => {
        if (error) {
          console.error('%c❌ Refresh subscriber received error', 'color: #FF5722; font-weight: bold', {
            error: error.message
          });
          reject(error);
          return;
        }
        
        if (!token) {
          console.error('%c❌ Refresh subscriber received no token', 'color: #FF5722; font-weight: bold');
          reject(new Error('No token received from refresh'));
          return;
        }
        
        if (originalRequest) {
          console.log('%c🔄 Applying refreshed token to queued request', 'color: #4CAF50; font-weight: bold', {
            url: originalRequest.url,
            tokenFirstChars: token.substring(0, 15) + '...'
          });
          originalRequest.headers.Authorization = `Bearer ${token}`;
          resolve(api(originalRequest));
        } else {
          resolve(token);
        }
      });
    });
  }

  isRefreshing = true;
  
  // Check offline status first - this is critical
  if (isOffline) {
    console.log('%c📵 Device is offline - using cached token for offline access', 'color: #FF9800; font-weight: bold');
    // When offline, use whatever token we have without attempting refresh
    const cachedToken = getCookie('token') || getCookie('token_pwa');
    
    if (!cachedToken) {
      console.warn('%c⚠️ No cached token available for offline use', 'color: #FF9800; font-weight: bold');
      isRefreshing = false;
      return Promise.reject(new Error('No token available for offline use'));
    }
    
    console.log('%c✅ Using cached token for offline access', 'color: #4CAF50; font-weight: bold', {
      tokenFirstChars: cachedToken.substring(0, 10) + '...',
      timestamp: new Date().toISOString()
    });
    
    // Notify subscribers about the offline token
    refreshSubscribers.forEach((callback) => callback(cachedToken));
    refreshSubscribers = [];
    isRefreshing = false;
    
    // If we have an original request, update its Authorization header
    if (originalRequest) {
      originalRequest.headers.Authorization = `Bearer ${cachedToken}`;
      return api(originalRequest);
    }
    
    return Promise.resolve(cachedToken);
  }
  
  // We're online, proceed with normal token refresh
  // Try all possible sources for refresh token with clear logging
  let refreshToken = getCookie('refreshToken');
  let tokenSource = 'regular_cookie';
  
  if (!refreshToken) {
    refreshToken = getCookie('refreshToken_pwa');
    tokenSource = 'pwa_cookie';
  }
  
  if (!refreshToken) {
    refreshToken = localStorage.getItem('refreshToken');
    tokenSource = 'localStorage';
  }
  
  if (!refreshToken) {
    refreshToken = localStorage.getItem('refreshToken_pwa');
    tokenSource = 'localStorage_pwa';
  }
  
  console.log('%c🔄 Using refresh token', 'color: #FF9800; font-weight: bold', {
    hasToken: !!refreshToken,
    tokenSource,
    tokenFirstChars: refreshToken ? (refreshToken.substring(0, 10) + '...') : 'none',
    timestamp: new Date().toISOString()
  });

  if (!refreshToken) {
    console.error('%c❌ No refresh token available from any source', 'color: #FF5722; font-weight: bold');
    isRefreshing = false;
    removeCookie('token');
    removeCookie('refreshToken');
    removeCookie('token_pwa');
    removeCookie('refreshToken_pwa');
    removeCookie('user');
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('token_pwa');
    localStorage.removeItem('refreshToken_pwa');
    localStorage.removeItem('user');
    window.dispatchEvent(new CustomEvent('auth-state-changed', { detail: { isAuthenticated: false } }));
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
    return Promise.reject(new Error('No refresh token available'));
  }

  try {
    console.log('%c🔄 Token Refresh Attempt', 'color: #2196F3; font-weight: bold', {
      tokenType: 'refresh',
      source: tokenSource,
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

    // Also set PWA cookies for offline use
    setCookie('token_pwa', token, {
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000 // 15 minutes, matching access token expiration
    });
    
    if (newRefreshToken) {
      setCookie('refreshToken_pwa', newRefreshToken, {
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
      });
    }

    // Update user data if provided
    if (user) {
      setCookie('user', JSON.stringify(user));
      window.dispatchEvent(new CustomEvent('auth-state-changed', { detail: { isAuthenticated: true, user } }));
    }

    // Notify subscribers and clear the queue
    refreshSubscribers.forEach((callback) => callback(token));
    refreshSubscribers = [];

    // Update the original request with new token if provided
    if (originalRequest) {
      originalRequest.headers.Authorization = `Bearer ${token}`;
    }

    console.log('%c✨ Token Refresh Success', 'color: #9C27B0; font-weight: bold', {
      accessTokenUpdated: true,
      refreshTokenUpdated: !!newRefreshToken,
      userUpdated: !!user,
      timestamp: new Date().toISOString()
    });

    isRefreshing = false;
    return originalRequest ? api(originalRequest) : Promise.resolve(token);
  } catch (error) {
    isRefreshing = false;
    refreshSubscribers = [];

    // Centralized auth clear and redirect
    clearAuthAndRedirect('/login');
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
        // Don't redirect to login if we're offline - use cached data instead
        if (isOffline) {
          console.log('%c📵 Device is offline - skipping auth redirect', 'color: #FF9800; font-weight: bold');
          return Promise.reject(error);
        }
        clearAuthAndRedirect('/login');
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

        // Debug token received from refresh
        try {
          const decodedToken = JSON.parse(atob(token.split('.')[1]));
          console.debug('%c🔄 Refresh Token Details:', 'color: #9C27B0; font-weight: bold', {
            exp: decodedToken.exp,
            expDate: new Date(decodedToken.exp * 1000).toISOString(),
            currentTime: new Date().toISOString(),
            timeUntilExpiry: Math.round((decodedToken.exp * 1000 - Date.now()) / 1000) + ' seconds',
            userId: decodedToken.userId || decodedToken.sub || 'unknown',
            tokenFirstChars: token.substring(0, 10) + '...'
          });
        } catch (e) {
          console.error('Failed to decode token:', e);
        }

        // Update cookies with new tokens
        setCookie('token', token);
        
        // CRITICAL: Always store the new refresh token when provided
        // This handles refresh token rotation where each token can only be used once
        if (newRefreshToken) {
          console.log('%c🔄 Storing new refresh token', 'color: #FF9800; font-weight: bold', {
            hasNewToken: true,
            tokenFirstChars: newRefreshToken.substring(0, 10) + '...',
            timestamp: new Date().toISOString()
          });
          setCookie('refreshToken', newRefreshToken);
        } else {
          console.warn('%c⚠️ No new refresh token provided', 'color: #FF5722; font-weight: bold', {
            timestamp: new Date().toISOString()
          });
        }
        
        // Also set PWA cookies for offline use
        setCookie('token_pwa', token, {
          path: '/',
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 15 * 60 * 1000 // 15 minutes, matching access token expiration
        });
        
        if (newRefreshToken) {
          setCookie('refreshToken_pwa', newRefreshToken, {
            path: '/',
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
          });
        }

        // If user data is included, update user cookie
        if (user) {
          setCookie('user', JSON.stringify(user));
        }
        
        // Notify the app that auth state has been refreshed successfully
        window.dispatchEvent(new CustomEvent('auth-state-changed', { 
          detail: { 
            isAuthenticated: true, 
            user: user || JSON.parse(getCookie('user') || '{}') 
          } 
        }));

        // Log successful token refresh
        console.log('%c✨ Session Validation - Tokens Refreshed', 'color: #9C27B0; font-weight: bold', {
          accessTokenUpdated: true,
          refreshTokenUpdated: !!newRefreshToken,
          userUpdated: !!user,
          timestamp: new Date().toISOString()
        });

        // Update authorization header for the original request
        originalRequest.headers.Authorization = `Bearer ${token}`;
        
        // Notify all subscribers about the new token
        console.log('%c🔔 Notifying subscribers about new token', 'color: #4CAF50; font-weight: bold', {
          subscribersCount: refreshSubscribers.length,
          tokenFirstChars: token.substring(0, 15) + '...'
        });
        
        refreshSubscribers.forEach(callback => callback(token));
        
        // Reset refresh state
        isRefreshing = false;
        refreshSubscribers = [];

        // If we're on the home page and authenticated, redirect to dashboard
        if (window.location.pathname === '/' && user) {
          window.location.href = '/dashboard';
          return;
        }

        // Retry the original request with new token
        return axios(originalRequest);

      } catch (refreshError) {
        console.error('%c❌ Token Refresh Failed:', 'color: #FF5722; font-weight: bold', {
          error: refreshError.message,
          status: refreshError.response?.status,
          statusText: refreshError.response?.statusText,
          data: refreshError.response?.data,
          timestamp: new Date().toISOString(),
          subscribersCount: refreshSubscribers.length,
          tokenSource: 'unknown' // Default value since tokenSource might not be defined in this context
        });

        // Notify all subscribers about the error
        console.log('%c🔔 Notifying subscribers about refresh error', 'color: #FF5722; font-weight: bold');
        refreshSubscribers.forEach(callback => callback(null, refreshError));
        
        isRefreshing = false;
        refreshSubscribers = [];

        // Handle specific error cases
        if (refreshError.response?.status === 401) {
          console.warn('%c⚠️ Refresh token was rejected (401 Unauthorized)', 'color: #FF9800; font-weight: bold', {
            reason: refreshError.response?.data?.message || 'Unknown reason',
            error: refreshError.response?.data?.error
          });
          
          // If we're online and got a 401, the token is invalid - clear auth and redirect
          if (!isOffline) {
            console.log('%c🚪 Redirecting to login due to invalid refresh token', 'color: #FF5722; font-weight: bold');
            clearAuthAndRedirect('/login');
            return Promise.reject(new Error('Invalid refresh token'));
          }
        }
        
        // Only clear tokens and redirect if we are online and the server responded with an error
        // Network errors usually have !refreshError.response
        if (!isOffline && refreshError.response) {
          console.log('%c🚪 Redirecting to login due to refresh failure', 'color: #FF5722; font-weight: bold');
          clearAuthAndRedirect('/login');
        } else {
          // If offline, do not clear tokens or redirect, just reject
          console.warn('[Offline] Token refresh failed, but user remains authenticated for offline access.');
          
          // When offline, try to use whatever token we have cached
          const cachedToken = getCookie('token') || getCookie('token_pwa');
          if (cachedToken && originalRequest) {
            console.log('%c📵 Using cached token for offline request despite refresh failure', 'color: #FF9800; font-weight: bold');
            originalRequest.headers.Authorization = `Bearer ${cachedToken}`;
            return api(originalRequest);
          }
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

import axios from 'axios';
import { Cookies } from 'react-cookie';

const cookies = new Cookies();

// Cookie management functions
export const getCookie = (name) => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    const cookieValue = parts.pop().split(';').shift();
    try {
      // Try to parse as JSON, if it fails return as is
      return JSON.parse(decodeURIComponent(cookieValue));
    } catch {
      return decodeURIComponent(cookieValue);
    }
  }
  return null;
};

export const setCookie = (name, value, options = {}) => {
  try {
    // Default options
    const defaultOptions = {
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production'
    };

    // Merge with provided options
    const cookieOptions = { ...defaultOptions, ...options };

    // Convert value to string if it's an object
    const stringValue = typeof value === 'object' ? 
      encodeURIComponent(JSON.stringify(value)) : 
      encodeURIComponent(value);

    // Build cookie string
    let cookieString = `${name}=${stringValue}`;
    
    // Add options
    if (cookieOptions.path) cookieString += `; path=${cookieOptions.path}`;
    if (cookieOptions.sameSite) cookieString += `; samesite=${cookieOptions.sameSite}`;
    if (cookieOptions.secure) cookieString += '; secure';
    if (cookieOptions.maxAge) cookieString += `; max-age=${cookieOptions.maxAge}`;
    if (cookieOptions.expires) cookieString += `; expires=${cookieOptions.expires.toUTCString()}`;
    if (cookieOptions.domain) cookieString += `; domain=${cookieOptions.domain}`;

    // Debug cookie setting
    console.debug('Setting Cookie:', {
      name,
      valueLength: stringValue.length,
      options: cookieOptions
    });

    // Set the cookie
    document.cookie = cookieString;

    // Verify cookie was set
    const verifyValue = getCookie(name);
    console.debug('Cookie Verification:', {
      name,
      wasSet: !!verifyValue,
      valueLength: verifyValue ? 
        (typeof verifyValue === 'string' ? verifyValue.length : JSON.stringify(verifyValue).length) 
        : 0
    });
  } catch (error) {
    console.error('Error setting cookie:', {
      name,
      error: error.message
    });
    throw error;
  }
};

export const removeCookie = (name, options = {}) => {
  cookies.remove(name, { path: '/', ...options });
};

// Get backend URL helper
export const getBackendUrl = (path = '') => {
  const baseUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
  return path.startsWith('http') ? path : `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
};

// Create axios instance
export const api = axios.create({
  baseURL: getBackendUrl(),
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest'
  }
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = getCookie('token');
    const csrfToken = getCookie('XSRF-TOKEN');
    
    // Debug token state
    console.debug('API Request - Token State:', {
      url: config.url,
      hasToken: !!token,
      tokenLength: token?.length
    });

    // Always set Authorization header if token exists
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    
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
      hasUser: !!response.data.user
    });

    // If we get a new token in the response, update it
    if (response.data.token) {
      setCookie('token', response.data.token, {
        path: '/',
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production'
      });
    }
    
    // If we get user data, update the user cookie
    if (response.data.user) {
      setCookie('user', response.data.user, {
        path: '/',
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production'
      });
    }
    
    return response;
  },
  async (error) => {
    // Debug error
    console.error('API Error:', {
      url: error.config?.url,
      status: error.response?.status,
      message: error.message,
      data: error.response?.data
    });

    if (error.response?.status === 401) {
      // Clear auth state on 401
      removeCookie('token');
      removeCookie('refreshToken');
      removeCookie('user');
    }
    return Promise.reject(error);
  }
);

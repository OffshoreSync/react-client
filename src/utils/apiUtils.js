import axios from 'axios';
import { Cookies } from 'react-cookie';

const cookies = new Cookies();

// Cookie management functions
export const getCookie = (name) => {
  return cookies.get(name);
};

export const setCookie = (name, value, options = {}) => {
  try {
    const defaultOptions = {
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production'
    };
    const cookieOptions = { ...defaultOptions, ...options };
    cookies.set(name, value, cookieOptions);
  } catch (error) {
    console.error('Error setting cookie:', { name, error: error.message });
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
  withCredentials: true, // Important for receiving cookies from server
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
    // Debug error
    console.error('API Error:', {
      url: error.config?.url,
      status: error.response?.status,
      message: error.message
    });

    if (error.response?.status === 401) {
      removeCookie('token');
      removeCookie('refreshToken');
      removeCookie('user');
    }
    return Promise.reject(error);
  }
);

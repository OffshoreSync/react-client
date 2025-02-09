import axios from 'axios';
import getBackendUrl from './apiUtils';

// CSRF Token Management Utility
export const csrfUtils = {
  // Fetch CSRF token from server
  async fetchCSRFToken() {
    try {
      const response = await axios.get('/api/csrf-token', {
        baseURL: getBackendUrl(),
        withCredentials: true
      });

      // Set CSRF token in axios headers
      axios.defaults.headers.common['X-XSRF-TOKEN'] = response.data.csrfToken;

      return response.data.csrfToken;
    } catch (error) {
      console.error('Failed to fetch CSRF token:', error);
      throw error;
    }
  },

  // Intercept axios requests to ensure CSRF token
  setupCSRFInterceptor() {
    axios.interceptors.request.use(async (config) => {
      // Skip GET requests and CSRF token endpoint
      if (config.method === 'get' || config.url.includes('/csrf-token')) {
        return config;
      }

      // Check if CSRF token exists, fetch if not
      if (!axios.defaults.headers.common['X-XSRF-TOKEN']) {
        await this.fetchCSRFToken();
      }

      return config;
    }, (error) => {
      return Promise.reject(error);
    });
  }
};

// Auto-setup CSRF protection when imported
csrfUtils.setupCSRFInterceptor();
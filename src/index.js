import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import axios from 'axios';
import { getBackendUrl } from './utils/apiUtils';
import reportWebVitals from './reportWebVitals';
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { initializeVersionTracking } from './utils/versionUtils';

// Import i18n configuration
import './i18n';

// Configure axios for CSRF protection
const configureAxios = async () => {
  try {
    // Set base URL
    axios.defaults.baseURL = getBackendUrl();
    
    // Global axios configurations
    axios.defaults.withCredentials = true;
    axios.defaults.timeout = 5000;

    // Explicit CSRF token configuration
    axios.defaults.xsrfCookieName = 'XSRF-TOKEN';
    axios.defaults.xsrfHeaderName = 'X-XSRF-TOKEN';

    // Configure default headers
    axios.defaults.headers.common['Content-Type'] = 'application/json';
    axios.defaults.headers.common['Accept'] = 'application/json';

    // Fetch CSRF token with comprehensive options
    const csrfResponse = await axios.get('/api/csrf-token', {
      withCredentials: true,
      headers: {
        'X-Requested-With': 'XMLHttpRequest'
      }
    });

    // Safely access and set CSRF token
    const csrfToken = csrfResponse.data?.csrfToken;
    if (csrfToken) {
      // Set the CSRF token in both headers and defaults
      axios.defaults.headers.common['X-XSRF-TOKEN'] = csrfToken;
      
      // Add interceptor to include CSRF token in all requests
      axios.interceptors.request.use(config => {
        config.headers['X-XSRF-TOKEN'] = csrfToken;
        return config;
      }, error => {
        return Promise.reject(error);
      });
      
      console.log('CSRF token successfully configured:', {
        token: csrfToken,
        baseURL: axios.defaults.baseURL
      });
    } else {
      console.warn('CSRF token not found in response');
    }
  } catch (error) {
    console.error('Failed to configure CSRF protection:', {
      errorMessage: error.message,
      response: error.response ? error.response.data : 'No response',
      config: error.config
    });
    throw error;  // Rethrow to prevent rendering without CSRF token
  }
};

// Ensure axios is configured before rendering
const renderApp = async () => {
  await configureAxios();
  
  // Initialize version tracking
  await initializeVersionTracking();
  
  const root = ReactDOM.createRoot(document.getElementById('root'));
  root.render(
    <React.StrictMode>
      <I18nextProvider i18n={i18n}>
        <GoogleOAuthProvider clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID}>
          <App />
        </GoogleOAuthProvider>
      </I18nextProvider>
    </React.StrictMode>
  );
};

renderApp().catch(error => {
  console.error('Failed to initialize app:', error);
});

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();

import React, { useState, useEffect, useCallback } from 'react';
import { 
  BrowserRouter as Router, 
  Routes, 
  Route, 
  Navigate, 
  useLocation,
  useNavigate 
} from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { blue, green } from '@mui/material/colors';
import CssBaseline from '@mui/material/CssBaseline';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { useTranslation } from 'react-i18next';
import { CookiesProvider } from 'react-cookie';
import CircularProgress from '@mui/material/CircularProgress';

// Import i18n configuration
import './i18n';

// Import components
import Home from './components/Home';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import PasswordReset from './components/PasswordReset';
import Settings from './components/Settings';
import Sync from './components/Sync';
import Navbar from './components/Navbar';
import Register from './components/Register';
import EditProfile from './components/EditProfile';
import FriendManagement from './components/FriendManagement';
import VerifyEmail from './components/VerifyEmail';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import TermsPage from './pages/TermsPage';
import { getCookie, setCookie, removeCookie, api } from './utils/apiUtils';
import { AuthProvider } from './context/AuthContext';

// Define public routes that don't require authentication
const publicRoutes = ['/', '/home', '/login', '/register', '/verify-email', '/reset-password', '/forgot-password', '/privacy-policy', '/terms'];

// Explicitly declare colors to prevent no-undef
const primaryColor = blue[500];
const secondaryColor = green[500];

// Create custom theme
const theme = createTheme({
  palette: {
    primary: {
      main: primaryColor,
    },
    secondary: {
      main: secondaryColor,
    },
    background: {
      default: '#f4f4f4',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
    h1: {
      fontSize: '2.5rem',
      fontWeight: 600,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 500,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
  },
});

// Wrapper component to handle routing-specific hooks
function AppRoutes() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check authentication status
  const checkAuth = useCallback(async () => {
    try {
      // Skip auth check for public routes
      if (publicRoutes.includes(location.pathname)) {
        setIsCheckingAuth(false);
        return;
      }

      // Check for both token and refresh token
      const token = getCookie('token');
      const refreshToken = getCookie('refreshToken') || getCookie('refreshToken_pwa');

      // Debug token state
      console.debug('Auth Check - Token State:', {
        hasAccessToken: !!token,
        hasRefreshToken: !!refreshToken,
        timestamp: new Date().toISOString()
      });

      // If no tokens at all, clear auth state
      if (!token && !refreshToken) {
        console.warn('No authentication tokens found');
        setIsAuthenticated(false);
        setIsCheckingAuth(false);
        if (!publicRoutes.includes(location.pathname)) {
          navigate('/login', {
            state: { 
              returnTo: location.pathname,
              message: 'Your session has expired. Please log in again.'
            },
            replace: true
          });
        }
        return;
      }

      // Try to get user data from API
      try {
        const response = await api.get('/auth/profile');
        
        // Debug API response
        console.debug('Auth Check - API Response:', {
          status: response.status,
          hasUser: !!response.data.user,
          hasToken: !!response.data.token
        });
        
        if (response.data.user) {
          setIsAuthenticated(true);
          // Update user cookie in case it changed
          setCookie('user', JSON.stringify(response.data.user), {
            path: '/',
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production'
          });
          
          // If we got a new token, update it
          if (response.data.token) {
            setCookie('token', response.data.token, {
              path: '/',
              sameSite: 'lax',
              secure: process.env.NODE_ENV === 'production'
            });
          }
        } else {
          throw new Error('No user data in response');
        }
      } catch (apiError) {
        console.error('Auth check API error:', {
          message: apiError.message,
          response: apiError.response?.data,
          status: apiError.response?.status
        });

        // If the error is not a 401 or we don't have a refresh token, clear auth state
        if (apiError.response?.status !== 401 || !refreshToken) {
          setIsAuthenticated(false);
          removeCookie('token');
          removeCookie('refreshToken');
          removeCookie('user');
          if (!publicRoutes.includes(location.pathname)) {
            navigate('/login', {
              state: { 
                returnTo: location.pathname,
                message: 'Your session has expired. Please log in again.'
              },
              replace: true
            });
          }
        }
        // If it's a 401 with a refresh token, the token refresh interceptor will handle it
      }
    } catch (error) {
      console.error('Auth check error:', {
        message: error.message,
        stack: error.stack
      });
      
      // Clear auth state on unexpected errors
      setIsAuthenticated(false);
      removeCookie('token');
      removeCookie('refreshToken');
      removeCookie('user');
      if (!publicRoutes.includes(location.pathname)) {
        navigate('/login', {
          state: { 
            returnTo: location.pathname,
            message: 'An unexpected error occurred. Please log in again.'
          },
          replace: true
        });
      }
    } finally {
      setIsCheckingAuth(false);
    }
  }, [location.pathname, navigate]);

  // Protected route component
  const ProtectedRoute = ({ children }) => {
    if (isCheckingAuth) {
      return <CircularProgress />;
    }

    if (!isAuthenticated) {
      return <Navigate to="/login" state={{ 
        returnTo: location.pathname,
        message: 'Please log in to access this page.'
      }} replace />;
    }

    return children;
  };

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (isCheckingAuth) {
    return <CircularProgress />;
  }

  return (
    <div className="App">
      <Navbar isAuthenticated={isAuthenticated} />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        <Route path="/login" element={
          isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />
        } />
        <Route path="/register" element={
          isAuthenticated ? <Navigate to="/dashboard" replace /> : <Register />
        } />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<PasswordReset />} />
        <Route path="/reset-password" element={<PasswordReset />} />
        <Route path="/reset-password/:token" element={<PasswordReset />} />
        
        {/* Protected Routes */}
        <Route path="/settings" element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        } />
        <Route path="/edit-profile" element={
          <ProtectedRoute>
            <EditProfile />
          </ProtectedRoute>
        } />
        <Route path="/friends" element={
          <ProtectedRoute>
            <FriendManagement />
          </ProtectedRoute>
        } />
        <Route path="/sync" element={
          <ProtectedRoute>
            <Sync />
          </ProtectedRoute>
        } />
      </Routes>
    </div>
  );
}

// Main App component
function App() {
  return (
    <CookiesProvider>
      <GoogleOAuthProvider clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <AuthProvider>
            <Router>
              <AppRoutes />
            </Router>
          </AuthProvider>
        </ThemeProvider>
      </GoogleOAuthProvider>
    </CookiesProvider>
  );
}

export default App;

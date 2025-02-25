import React from 'react';
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
import { getCookie } from './utils/apiUtils';

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

  // Authentication check
  const isAuthenticated = () => {
    const token = getCookie('token');
    const user = getCookie('user');

    // Check token and user existence
    const isValidAuth = !!token && !!user;

    // If not authenticated and trying to access a protected route, redirect to login
    if (!isValidAuth && location.pathname !== '/login' && !location.pathname.startsWith('/verify-email')) {
      return false;
    }

    return isValidAuth;
  };

  // Protected route component
  const ProtectedRoute = ({ children }) => {
    if (!isAuthenticated()) {
      // Redirect to login with return path
      return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return children;
  };

  return (
    <div className="App">
      <Navbar />
      <Routes>
        <Route path="/" element={
          isAuthenticated() ? <Navigate to="/dashboard" /> : <Home />
        } />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<PasswordReset />} />
        <Route path="/reset-password" element={<PasswordReset />} />
        <Route path="/reset-password/:token" element={<PasswordReset />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/settings" 
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/edit-profile" 
          element={
            <ProtectedRoute>
              <EditProfile />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/friends" 
          element={
            <ProtectedRoute>
              <FriendManagement />
            </ProtectedRoute>
          } 
        />
        <Route path="/sync" element={<ProtectedRoute><Sync /></ProtectedRoute>} />
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
          <Router>
            <AppRoutes />
          </Router>
        </ThemeProvider>
      </GoogleOAuthProvider>
    </CookiesProvider>
  );
}

export default App;

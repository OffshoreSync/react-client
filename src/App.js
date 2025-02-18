import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { blue, green } from '@mui/material/colors';
import CssBaseline from '@mui/material/CssBaseline';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { useTranslation } from 'react-i18next';
import { CookiesProvider, useCookies } from 'react-cookie';

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

// Authentication check component
const PrivateRoute = ({ children }) => {
  const [cookies] = useCookies(['user']);
  const isAuthenticated = () => {
    try {
      // Check for Google login using cookies
      const googleUser = cookies.user 
        ? (typeof cookies.user === 'string' 
            ? JSON.parse(cookies.user) 
            : cookies.user)
        : null;
      
      const isGoogleLoggedIn = googleUser && googleUser.isGoogleUser;
      
      // For normal login, continue using localStorage
      const localStorageToken = localStorage.getItem('token');
      
      return isGoogleLoggedIn || localStorageToken;
    } catch (error) {
      console.error('Error parsing user cookie:', error);
      return false;
    }
  };
  return isAuthenticated() ? children : <Navigate to="/login" replace />;
};

function App() {
  const [cookies] = useCookies(['user']);

  // Function to check authentication
  const isAuthenticated = () => {
    try {
      // Check for Google login using cookies
      const googleUser = cookies.user 
        ? (typeof cookies.user === 'string' 
            ? JSON.parse(cookies.user) 
            : cookies.user)
        : null;
      
      const isGoogleLoggedIn = googleUser && googleUser.isGoogleUser;
      
      // For normal login, continue using localStorage
      const localStorageToken = localStorage.getItem('token');
      
      return isGoogleLoggedIn || localStorageToken;
    } catch (error) {
      console.error('Error parsing user cookie:', error);
      return false;
    }
  };

  return (
    <CookiesProvider>
      <GoogleOAuthProvider clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <Router>
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
                    <PrivateRoute>
                      <Dashboard />
                    </PrivateRoute>
                  } 
                />
                <Route 
                  path="/settings" 
                  element={
                    <PrivateRoute>
                      <Settings />
                    </PrivateRoute>
                  } 
                />
                <Route 
                  path="/edit-profile" 
                  element={
                    <PrivateRoute>
                      <EditProfile />
                    </PrivateRoute>
                  } 
                />
                <Route 
                  path="/friends" 
                  element={
                    <PrivateRoute>
                      <FriendManagement />
                    </PrivateRoute>
                  } 
                />
                <Route path="/sync" element={<PrivateRoute><Sync /></PrivateRoute>} />
              </Routes>
            </div>
          </Router>
        </ThemeProvider>
      </GoogleOAuthProvider>
    </CookiesProvider>
  );
}

export default App;

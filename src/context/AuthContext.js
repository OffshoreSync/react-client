import React, { createContext, useState, useContext, useEffect } from 'react';
import { api, getCookie, setCookie, removeCookie } from '../utils/apiUtils';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    // Initialize user from cookie if available
    const userCookie = getCookie('user');
    if (userCookie) {
      try {
        return JSON.parse(userCookie);
      } catch (e) {
        console.error('Failed to parse user cookie:', e);
      }
    }
    return null;
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchUserData = async () => {
    const token = getCookie('token');
    const refreshToken = getCookie('refreshToken') || getCookie('refreshToken_pwa');

    if (!token && !refreshToken) {
      console.warn('No tokens found, cannot fetch user data');
      setLoading(false);
      setUser(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/api/auth/profile');
      if (response.data.user) {
        setUser(response.data.user);
        // Update user cookie to ensure consistency
        setCookie('user', JSON.stringify(response.data.user), {
          path: '/',
          sameSite: 'lax',
          secure: process.env.NODE_ENV === 'production'
        });
      } else {
        console.warn('No user data received from profile endpoint');
        setUser(null);
      }
    } catch (error) {
      console.error('Failed to fetch user data:', {
        errorMessage: error.message,
        errorStatus: error.response?.status,
        hasToken: !!token,
        hasRefreshToken: !!refreshToken
      });

      if (error.response?.status === 401) {
        // Clear all auth-related cookies on 401
        ['token', 'refreshToken', 'refreshToken_pwa', 'user'].forEach(removeCookie);
        setUser(null);
      } else if (error.message === 'Network Error') {
        // Try to use cached user data if network fails
        const cachedUser = getCookie('user');
        if (cachedUser) {
          try {
            setUser(JSON.parse(cachedUser));
          } catch (parseError) {
            console.error('Failed to parse cached user:', parseError);
            setUser(null);
          }
        } else {
          setError('Unable to fetch user data. Please check your connection.');
        }
      } else {
        setError('Failed to fetch user data');
      }
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setError(null);
  };

  // Listen for auth state changes from token refresh
  useEffect(() => {
    const handleAuthStateChange = (event) => {
      const { isAuthenticated, user: newUser } = event.detail;
      console.debug('Auth State Change:', {
        isAuthenticated,
        hasUser: !!newUser,
        timestamp: new Date().toISOString()
      });
      
      if (isAuthenticated && newUser) {
        setUser(newUser);
      } else if (!isAuthenticated) {
        setUser(null);
      }
    };

    window.addEventListener('auth-state-changed', handleAuthStateChange);
    return () => window.removeEventListener('auth-state-changed', handleAuthStateChange);
  }, []);

  useEffect(() => {
    const token = getCookie('token');
    const refreshToken = getCookie('refreshToken') || getCookie('refreshToken_pwa');
    const cachedUser = getCookie('user');
    
    // Enhanced debug logging
    console.debug('Auth State Initialization:', {
      hasToken: !!token,
      hasRefreshToken: !!refreshToken,
      hasCachedUser: !!cachedUser,
      hasUser: !!user,
      timestamp: new Date().toISOString()
    });

    // Prioritize token-based authentication
    if (token || refreshToken) {
      fetchUserData();
    } else if (cachedUser) {
      // Fallback to cached user if no tokens
      try {
        const parsedUser = JSON.parse(cachedUser);
        setUser(parsedUser);
      } catch (error) {
        console.error('Failed to parse cached user:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    } else {
      setLoading(false);
      setUser(null);
    }
  }, []);

  // Keep user cookie in sync with state
  useEffect(() => {
    if (user) {
      try {
        const userString = JSON.stringify(user);
        if (userString !== getCookie('user')) {
          console.debug('Updating user cookie:', {
            userId: user.id,
            timestamp: new Date().toISOString()
          });
          setCookie('user', userString, {
            path: '/',
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production'
          });
        }
      } catch (e) {
        console.error('Failed to update user cookie:', e);
      }
    }
  }, [user]);

  const value = {
    user,
    setUser,
    loading,
    error,
    fetchUserData,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

import React, { createContext, useState, useContext, useEffect } from 'react';
import { api, getCookie, setCookie } from '../utils/apiUtils';

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
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/api/auth/profile');
      if (response.data.user) {
        setUser(response.data.user);
      }
    } catch (error) {
      console.error('Failed to fetch user data:', error);
      if (error.response?.status === 401) {
        setUser(null);
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

  useEffect(() => {
    const token = getCookie('token');
    const refreshToken = getCookie('refreshToken') || getCookie('refreshToken_pwa');
    
    // Debug auth state
    console.debug('Auth State Check:', {
      hasToken: !!token,
      hasRefreshToken: !!refreshToken,
      hasUser: !!user,
      timestamp: new Date().toISOString()
    });

    if (token || refreshToken) {
      fetchUserData();
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

import React, { createContext, useState, useContext, useEffect } from 'react';
import { api, getCookie } from '../utils/apiUtils';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
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

  useEffect(() => {
    const token = getCookie('token');
    if (token) {
      fetchUserData();
    } else {
      setLoading(false);
      setUser(null);
    }
  }, []);

  const value = {
    user,
    setUser,
    loading,
    error,
    fetchUserData
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

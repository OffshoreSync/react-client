import React, { createContext, useState, useContext, useEffect } from 'react';
import { api, getCookie, setCookie, removeCookie, getValidToken } from '../utils/apiUtils';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    // Initialize user from cookie if available
    const userCookie = getCookie('user');
    if (userCookie) {
      try {
        // Check if it's already an object (this shouldn't happen, but just in case)
        if (typeof userCookie === 'object' && userCookie !== null) {
          console.log('📝 User cookie is already an object, no parsing needed');
          return userCookie;
        }
        
        // Check for the problematic "[object Object]" string
        if (userCookie === "[object Object]") {
          console.error('🚨 User cookie contains invalid "[object Object]" string, using empty user');
          return {};
        }
        
        // Normal parsing
        return JSON.parse(userCookie);
      } catch (e) {
        console.error('🤦‍♂️ Failed to parse user cookie:', e);
        
        // If parsing fails but we have a string that looks like an object, try to recover
        if (typeof userCookie === 'string' && 
            userCookie.startsWith('{') && 
            userCookie.endsWith('}')) {
          console.warn('🔄 Attempting to recover from JSON parse error with manual cleanup');
          try {
            // Try a more lenient parsing approach
            // This is a last resort attempt
            const cleanedJson = userCookie
              .replace(/\\"/g, '"') // Fix escaped quotes
              .replace(/"{/g, '{').replace(/}"/g, '}') // Fix quoted objects
              .replace(/\n/g, '\\n'); // Fix newlines
            
            return JSON.parse(cleanedJson);
          } catch (recoveryError) {
            console.error('🚫 Recovery attempt failed:', recoveryError);
          }
        }
      }
    }
    return null;
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Centralized login method
  const login = async (token, refreshToken, userData) => {
    console.log('🔐 Centralizing login through AuthContext');
    
    // Store tokens in cookies
    setCookie('token', token, {
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });

    setCookie('refreshToken', refreshToken, {
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });

    // Set user data in state
    setUser(userData);

    // Store user data in cookie for persistence
    setCookie('user', JSON.stringify(userData), {
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });

    // Dispatch auth state change event
    window.dispatchEvent(new CustomEvent('auth-state-changed', { 
      detail: { 
        isAuthenticated: true, 
        user: userData 
      } 
    }));

    return userData;
  };

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
      timestamp: new Date().toISOString()
    });

    // Note: We no longer need a separate offline check here as getValidToken and api calls
    // will handle offline detection internally

    // Online flow or offline without cached user
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
        const currentCookie = getCookie('user');
        
        // Check if we need to update the cookie
        let needsUpdate = true;
        
        if (currentCookie) {
          if (typeof currentCookie === 'object' && currentCookie !== null) {
            // If the cookie is already an object, compare directly
            const isSameId = currentCookie.id === user.id;
            const isSameWorkSchedule = 
              JSON.stringify(currentCookie.workSchedule || {}) === 
              JSON.stringify(user.workSchedule || {});
              
            if (isSameId && isSameWorkSchedule) {
              needsUpdate = false;
            }
          } else if (currentCookie === "[object Object]") {
            // Always update if we have the problematic string
            needsUpdate = true;
          } else {
            // Try to parse the string cookie
            try {
              const parsedCookie = JSON.parse(currentCookie);
              
              // Compare the parsed cookie with the current user object
              const isSameId = parsedCookie.id === user.id;
              const isSameWorkSchedule = 
                JSON.stringify(parsedCookie.workSchedule || {}) === 
                JSON.stringify(user.workSchedule || {});
                
              if (isSameId && isSameWorkSchedule) {
                needsUpdate = false;
              }
            } catch (parseError) {
              // If parsing fails, the cookie is not valid JSON
              console.warn('Current user cookie is not valid JSON, will update it');
              // We'll update the cookie since it's not in the expected format
            }
          }
        }
        
        if (needsUpdate) {
          console.debug('Updating user cookie:', {
            userId: user.id,
            hasWorkSchedule: !!user.workSchedule,
            nextOnBoardDate: user.workSchedule?.nextOnBoardDate,
            nextOffBoardDate: user.workSchedule?.nextOffBoardDate,
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

  // Periodic token refresh mechanism
  useEffect(() => {
    // Only run if user is logged in
    if (!user) return;

    console.log('🔄 Starting periodic token refresh check (every 60 seconds)');
    
    // Check token validity every minute
    const tokenRefreshInterval = setInterval(async () => {
      try {
        console.log('🔍 Checking token validity...');
        // getValidToken will handle offline detection and skip validation when offline
        const validToken = await getValidToken();
        
        if (validToken) {
          console.log('✅ Token is valid or has been refreshed');
        } else {
          console.warn('⚠️ No valid token available, user may be logged out');
          // Attempt to fetch user data which will handle token refresh if needed
          fetchUserData();
        }
      } catch (error) {
        console.error('❌ Error during periodic token check:', error);
      }
    }, 60000); // Check every 60 seconds
    
    return () => {
      console.log('🛑 Stopping periodic token refresh check');
      clearInterval(tokenRefreshInterval);
    };
  }, [user]);

  const value = {
    user,
    setUser,
    loading,
    error,
    fetchUserData,
    login,
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

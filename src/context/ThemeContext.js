import React, { createContext, useState, useContext, useEffect } from 'react';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import { getTheme } from '../theme';
import { getCookie, setCookie } from '../utils/apiUtils';

// Create the theme context
const ThemeContext = createContext();

// Custom hook to use the theme context
export const useTheme = () => useContext(ThemeContext);

// Theme provider component
export const ThemeProvider = ({ children }) => {
  // Get theme preference from cookie or default to 'light'
  const [mode, setMode] = useState(getCookie('themeMode') || 'light');
  
  // Generate the theme based on the current mode
  const theme = getTheme(mode);
  
  // Toggle between light and dark mode
  const toggleTheme = () => {
    const newMode = mode === 'light' ? 'dark' : 'light';
    setMode(newMode);
    
    // Save theme preference in cookie
    setCookie('themeMode', newMode, { 
      path: '/', 
      maxAge: 365 * 24 * 60 * 60  // 1 year
    });
  };
  
  // Effect to sync with system preference if no cookie is set
  useEffect(() => {
    if (!getCookie('themeMode')) {
      const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setMode(prefersDarkMode ? 'dark' : 'light');
    }
  }, []);
  
  return (
    <ThemeContext.Provider value={{ mode, toggleTheme }}>
      <MuiThemeProvider theme={theme}>
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};

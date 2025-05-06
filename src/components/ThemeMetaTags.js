import { useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';

/**
 * Component that updates mobile status bar colors based on the current theme
 * This component doesn't render anything, it just updates meta tags
 */
const ThemeMetaTags = () => {
  const { mode } = useTheme();
  
  useEffect(() => {
    // Get the theme-color meta tag
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    
    // Get the apple-mobile-web-app-status-bar-style meta tag (for iOS)
    let appleMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    
    // If the apple meta tag doesn't exist, create it
    if (!appleMeta) {
      appleMeta = document.createElement('meta');
      appleMeta.setAttribute('name', 'apple-mobile-web-app-status-bar-style');
      document.head.appendChild(appleMeta);
    }
    
    // Set apple-mobile-web-app-capable meta tag
    let appleCapableMeta = document.querySelector('meta[name="apple-mobile-web-app-capable"]');
    if (!appleCapableMeta) {
      appleCapableMeta = document.createElement('meta');
      appleCapableMeta.setAttribute('name', 'apple-mobile-web-app-capable');
      appleCapableMeta.setAttribute('content', 'yes');
      document.head.appendChild(appleCapableMeta);
    }
    
    // Update meta tags based on current theme
    if (mode === 'dark') {
      // Dark theme - use a light color for status bar to get BLACK icons
      // This makes the WiFi, battery, and other status icons BLACK in dark mode
      if (themeColorMeta) themeColorMeta.setAttribute('content', '#9DCBF5'); // Light blue
      appleMeta.setAttribute('content', 'default'); // Light status bar with dark icons
      
      // For iOS PWA mode
      document.documentElement.style.setProperty('--apple-status-bar-style', 'black-translucent');
    } else {
      // Light theme - use a dark color for status bar to get WHITE icons
      // This makes the WiFi, battery, and other status icons WHITE in light mode
      if (themeColorMeta) themeColorMeta.setAttribute('content', '#1565C0'); // Dark blue
      appleMeta.setAttribute('content', 'black'); // Dark status bar with light icons
      
      // For iOS PWA mode
      document.documentElement.style.setProperty('--apple-status-bar-style', 'black');
    }
  }, [mode]);
  
  // This component doesn't render anything
  return null;
};

export default ThemeMetaTags;

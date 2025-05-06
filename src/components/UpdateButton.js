import React, { useState, useEffect } from 'react';
import { IconButton, Tooltip } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useTranslation } from 'react-i18next';
import { clearCachesIfNewVersion, getStoredVersion } from '../utils/versionUtils';

const UpdateButton = () => {
  console.log('UpdateButton component mounted');
  const { t } = useTranslation();
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [versionInfo, setVersionInfo] = useState({
    storedVersion: null,
    latestVersion: null,
    lastChecked: null
  });
  
  useEffect(() => {
    console.log('UpdateButton useEffect running');
    // Check if we're running an older version
    const checkForUpdates = async () => {
      try {
        // Get the stored version from cache
        const storedSha = await getStoredVersion();
        
        // If no stored SHA, this might be the first run - don't show update button
        if (!storedSha) {
          setIsUpdateAvailable(false);
          return;
        }
        
        // Now check if there's a new version available
        console.log('Fetching version.json...');
        const response = await fetch(`/version.json?_=${Date.now()}`, {
          cache: 'no-store',  // Ensure we don't cache this request
          headers: { 'Pragma': 'no-cache' }
        });
        console.log('version.json fetch response:', response.status, response.statusText);
        if (response.ok) {
          const data = await response.json();
          console.log('version.json data:', data);
          // Compare the stored SHA with the one from version.json
          const newVersionAvailable = storedSha && data.gitSha && (storedSha !== data.gitSha);
          
          const versionData = {
            storedVersion: storedSha,
            latestVersion: data.gitSha,
            updateAvailable: newVersionAvailable,
            timestamp: new Date().toISOString()
          };
          
          console.log('Update check:', versionData);
          
          // Update the state based on the comparison
          setIsUpdateAvailable(newVersionAvailable);
          setVersionInfo(versionData);
        }
      } catch (error) {
        console.error('Error checking for updates:', error);
      }
    };
    
    // Check immediately
    checkForUpdates();
    
    // Set up interval to check periodically (every 5 minutes)
    const interval = setInterval(checkForUpdates, 5 * 60 * 1000);
    
    // Clean up the interval when the component unmounts
    return () => clearInterval(interval);
  }, []);
  
  const handleUpdate = () => {
    // Clear caches and update to the latest version
    clearCachesIfNewVersion();
  };
  
  // For debugging purposes, always render in development mode
  const isDev = process.env.NODE_ENV === 'development';
  
  if (!isUpdateAvailable && !isDev) {
    console.log('UpdateButton not rendering - no update available');
    return null; // Don't render anything if no update is available in production
  }
  
  console.log('UpdateButton rendering - update IS available or in development mode');
  
  // Different UI for development mode vs production with update
  const tooltipTitle = isDev && !isUpdateAvailable
    ? `Dev Mode - Current: ${versionInfo.storedVersion || 'None'}`
    : t('update.newVersionAvailable');
    
  return (
    <Tooltip title={tooltipTitle}>
      <IconButton
        onClick={handleUpdate}
        color="inherit"
        size="medium"
        sx={{ 
          mx: 1,
          color: isDev && !isUpdateAvailable ? 'gray' : 'white',
          animation: isUpdateAvailable ? 'pulse 2s infinite' : 'none',
          '@keyframes pulse': {
            '0%': { transform: 'rotate(0deg)' },
            '20%': { transform: 'rotate(30deg)' },
            '40%': { transform: 'rotate(0deg)' },
            '60%': { transform: 'rotate(-30deg)' },
            '80%': { transform: 'rotate(0deg)' },
            '100%': { transform: 'rotate(0deg)' }
          },
          '&:hover': { 
            backgroundColor: 'rgba(255,255,255,0.1)' 
          }
        }}
      >
        <RefreshIcon />
      </IconButton>
    </Tooltip>
  );
};

export default UpdateButton;

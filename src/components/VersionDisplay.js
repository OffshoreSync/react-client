import React, { useState, useEffect } from 'react';
import { Typography, Tooltip } from '@mui/material';
import { getStoredVersion } from '../utils/versionUtils';

const VersionDisplay = ({ variant = "caption", color = "text.secondary", sx = {} }) => {
  const [versionInfo, setVersionInfo] = useState({
    version: '1.0.0', // Default fallback version
    shortSha: '',
    buildTime: ''
  });
  
  useEffect(() => {
    // Function to get version info from cache and version.json
    const fetchVersionInfo = async () => {
      try {
        // First, check cache for the current running version SHA
        const storedSha = await getStoredVersion();
        
        // Then fetch the version.json file for additional metadata
        const response = await fetch(`/version.json?_=${Date.now()}`, {
          cache: 'no-store',  // Ensure we don't cache this request
          headers: { 'Pragma': 'no-cache' }
        });
        if (response.ok) {
          const data = await response.json();
          
          // If we have a stored SHA, use that as the current version
          // This ensures we show the version the user is actually running
          if (storedSha) {
            // Find the matching SHA in the fetched data
            if (storedSha === data.gitSha) {
              // User is on the latest version
              setVersionInfo({
                version: data.version || '1.0.0',
                shortSha: data.shortSha || '',
                buildTime: data.buildTime ? new Date(data.buildTime).toLocaleString() : ''
              });
            } else {
              // User is on an older version, try to find the SHA in localStorage
              // For now, just show the SHA they're running
              setVersionInfo({
                version: data.version || '1.0.0', // Still use the version number from package.json
                shortSha: storedSha.substring(0, 7), // Use first 7 chars of stored SHA
                buildTime: ''
              });
            }
          } else {
            // No stored SHA, must be first run, use the version.json data
            setVersionInfo({
              version: data.version || '1.0.0',
              shortSha: data.shortSha || '',
              buildTime: data.buildTime ? new Date(data.buildTime).toLocaleString() : ''
            });
          }
        }
      } catch (error) {
        console.error('Error fetching version info:', error);
        
        // If fetch fails, still try to show the stored SHA if available
        const storedSha = await getStoredVersion();
        if (storedSha) {
          setVersionInfo({
            version: '1.0.0', // Default version
            shortSha: storedSha.substring(0, 7),
            buildTime: ''
          });
        }
      }
    };
    
    fetchVersionInfo();
  }, []);
  
  // Check if we're on an older version by comparing with version.json
  const [isOldVersion, setIsOldVersion] = useState(false);
  const [latestVersion, setLatestVersion] = useState(null);
  
  useEffect(() => {
    // Check if we're running an older version
    const checkLatestVersion = async () => {
      try {
        const storedSha = await getStoredVersion();
        if (!storedSha) return;
        
        const response = await fetch(`/version.json?_=${Date.now()}`, {
          cache: 'no-store',  // Ensure we don't cache this request
          headers: { 'Pragma': 'no-cache' }
        });
        if (response.ok) {
          const data = await response.json();
          if (storedSha !== data.gitSha) {
            setIsOldVersion(true);
            setLatestVersion({
              version: data.version,
              shortSha: data.shortSha
            });
          }
        }
      } catch (error) {
        console.error('Error checking latest version:', error);
      }
    };
    
    checkLatestVersion();
  }, []);
  
  // Enhanced tooltip content
  const tooltipContent = versionInfo.shortSha ? 
    `Current Build: ${versionInfo.shortSha}${versionInfo.buildTime ? `\nBuilt: ${versionInfo.buildTime}` : ''}${isOldVersion ? `\n\nNext: ${latestVersion?.version} (${latestVersion?.shortSha})` : ''}` : 
    '';
  
  return (
    <Tooltip title={tooltipContent} arrow placement="top">
      <Typography 
        variant={variant} 
        color={color}
        sx={{ fontStyle: 'italic', fontWeight: 'light', cursor: 'help', ...sx }}
      >
        v{versionInfo.version}
        {versionInfo.shortSha && ` (${versionInfo.shortSha})`}
      </Typography>
    </Tooltip>
  );
};

export default VersionDisplay;

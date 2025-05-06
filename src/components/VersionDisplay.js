import React, { useState, useEffect } from 'react';
import { Typography, Tooltip } from '@mui/material';

const VersionDisplay = ({ variant = "caption", color = "text.secondary", sx = {} }) => {
  const [versionInfo, setVersionInfo] = useState({
    version: '1.0.0', // Default fallback version
    shortSha: '',
    buildTime: ''
  });
  
  useEffect(() => {
    // Fetch version info from version.json
    const fetchVersionInfo = async () => {
      try {
        // Use cache-busting to ensure we get the latest version
        const response = await fetch(`/version.json?_=${Date.now()}`);
        if (response.ok) {
          const data = await response.json();
          setVersionInfo({
            version: data.version || '1.0.0',
            shortSha: data.shortSha || '',
            buildTime: data.buildTime ? new Date(data.buildTime).toLocaleString() : ''
          });
        }
      } catch (error) {
        console.error('Error fetching version info:', error);
      }
    };
    
    fetchVersionInfo();
  }, []);
  
  const tooltipContent = versionInfo.shortSha ? 
    `Build: ${versionInfo.shortSha}${versionInfo.buildTime ? `\nBuilt: ${versionInfo.buildTime}` : ''}` : 
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

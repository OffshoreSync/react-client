import { clearFetchCache } from './apiUtils';

// Local storage keys
const VERSION_KEY = 'offshoresync_version';
const LAST_CHECK_KEY = 'offshoresync_version_last_check';
const VERSION_FILE_PATH = '/version.json';

/**
 * Checks the current app version against the local version.json file
 * Returns true if a new version is available
 * @param {boolean} bypassCooldown - If true, bypass the 15-minute cooldown
 */
export const checkForNewVersion = async (bypassCooldown = false) => {
  try {
    // Don't check more than once every 15 minutes, unless bypassCooldown is true
    const lastCheck = localStorage.getItem(LAST_CHECK_KEY);
    const now = Date.now();
    
    if (!bypassCooldown && lastCheck && (now - parseInt(lastCheck, 10)) < 15 * 60 * 1000) {
      console.log('🔄 Skipping version check - checked recently');
      return false;
    }
    
    // Update last check time
    localStorage.setItem(LAST_CHECK_KEY, now.toString());
    
    // Get current stored version
    const storedVersion = localStorage.getItem(VERSION_KEY);
    
    // Fetch the version.json file with cache-busting query parameter
    // The query parameter ensures the browser always makes a fresh request
    const response = await fetch(`${VERSION_FILE_PATH}?_=${now}`);
    
    if (!response.ok) {
      console.error('❌ Failed to fetch version info:', response.status);
      return false;
    }
    
    const versionData = await response.json();
    const currentSha = versionData.gitSha;
    
    // If no stored version yet (first visit), we need to initialize it
    // BUT we should not update it on regular version checks
    if (!storedVersion) {
      // In development mode, we'll still show the update button for testing
      if (process.env.NODE_ENV === 'development') {
        console.log('%c🔧 Development mode: Not setting initial version to allow testing', 'color: #9C27B0; font-weight: bold');
        return true; // Return true to show update button in dev mode
      } else {
        // In production, initialize the version to prevent showing update on first visit
        localStorage.setItem(VERSION_KEY, currentSha);
        return false;
      }
    }
    
    // Check if the version has changed
    const isNewVersion = storedVersion !== currentSha;
    
    console.log(`%c🔍 Version check: ${isNewVersion ? 'NEW VERSION DETECTED!' : 'No changes'}`, 
      `color: ${isNewVersion ? '#FF5722' : '#4CAF50'}; font-weight: bold`, {
      stored: storedVersion || 'none',
      current: currentSha,
      shortSha: versionData.shortSha,
      timestamp: versionData.timestamp,
      buildTime: versionData.buildTime,
      needsUpdate: isNewVersion
    });
    
    // If no stored version or versions don't match, return true but DON'T update localStorage yet
    // We'll only update localStorage after the user completes the update process
    if (isNewVersion) {
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('❌ Error checking version:', error);
    return false;
  }
};

/**
 * Clears all application caches when a new version is detected
 * @param {boolean} bypassCooldown - If true, bypass the 15-minute cooldown
 */
export const clearCachesIfNewVersion = async (bypassCooldown = false) => {
  try {
    const isNewVersion = await checkForNewVersion(bypassCooldown);
    
    if (isNewVersion) {
      console.log('%c🆕 NEW VERSION DETECTED - CLEARING CACHES', 'color: #FF5722; font-weight: bold; font-size: 14px; background: #FBE9E7; padding: 5px; border-radius: 3px;');
      
      // Clear fetch API caches
      console.log('%c🧹 Clearing fetch API caches...', 'color: #FF9800; font-weight: bold');
      clearFetchCache();
      
      // Clear cache storage
      if ('caches' in window) {
        console.log('%c🧹 Clearing service worker caches...', 'color: #FF9800; font-weight: bold');
        const cacheNames = await caches.keys();
        console.log('Found caches:', cacheNames);
        await Promise.all(
          cacheNames.map(cacheName => {
            console.log(`Deleting cache: ${cacheName}`);
            return caches.delete(cacheName);
          })
        );
      }
      
      // Clear localStorage except for version info
      console.log('%c🧹 Clearing localStorage...', 'color: #FF9800; font-weight: bold');
      const keysToKeep = [VERSION_KEY, LAST_CHECK_KEY];
      const removedKeys = [];
      Object.keys(localStorage).forEach(key => {
        if (!keysToKeep.includes(key)) {
          localStorage.removeItem(key);
          removedKeys.push(key);
        }
      });
      console.log('Removed localStorage keys:', removedKeys);
      
      // Add a flag to indicate we just cleared cache due to version change
      sessionStorage.setItem('cache_cleared_for_version', 'true');
      
      // Get the latest version SHA and store it in localStorage
      // This is the only place we should update the stored version
      try {
        const response = await fetch(`${VERSION_FILE_PATH}?_=${Date.now()}`);
        if (response.ok) {
          const versionData = await response.json();
          console.log('%c🔄 Updating stored version to:', 'color: #2196F3; font-weight: bold', versionData.gitSha);
          
          // In development mode, we might want to skip updating localStorage for testing purposes
          if (process.env.NODE_ENV === 'development' && !bypassCooldown) {
            console.log('%c🔧 Development mode: Not updating stored version to allow testing', 'color: #9C27B0; font-weight: bold');
          } else {
            // In production or when manually updating, always update localStorage
            localStorage.setItem(VERSION_KEY, versionData.gitSha);
          }
        }
      } catch (error) {
        console.error('Error updating stored version:', error);
      }
      
      console.log('%c🔄 Reloading application to apply new version...', 'color: #2196F3; font-weight: bold');
      // Reload the application to ensure clean state
      setTimeout(() => {
        window.location.reload(true);
      }, 1000); // Small delay to allow logs to be seen
      
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('❌ Error clearing caches:', error);
    return false;
  }
};

/**
 * Initializes version checking on app startup
 */
export const initVersionCheck = () => {
  // Don't check immediately on load to avoid updating localStorage
  // This allows the update button to appear if there's a new version
  
  // Set up periodic checks (every 15 minutes)
  // First check will happen after 15 minutes, not immediately
  setInterval(() => {
    clearCachesIfNewVersion();
  }, 15 * 60 * 1000);
  
  // Schedule a version check after a short delay to allow the app to initialize
  // This won't update localStorage, just check if there's a new version
  setTimeout(() => {
    // Just check if there's a new version, don't update localStorage
    checkForNewVersion(true).then(isNewVersion => {
      if (isNewVersion) {
        console.log('%c🔍 New version detected on startup, update button will be shown', 'color: #FF5722; font-weight: bold');
      }
    });
  }, 3000); // Check after 3 seconds
};

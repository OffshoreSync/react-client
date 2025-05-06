import { clearFetchCache } from './apiUtils';

// Local storage keys
const VERSION_KEY = 'offshoresync_version';
const LAST_CHECK_KEY = 'offshoresync_version_last_check';
const VERSION_FILE_PATH = '/version.json';

/**
 * Checks the current app version against the local version.json file
 * Returns true if a new version is available
 */
export const checkForNewVersion = async () => {
  try {
    // Don't check more than once every 15 minutes
    const lastCheck = localStorage.getItem(LAST_CHECK_KEY);
    const now = Date.now();
    
    if (lastCheck && (now - parseInt(lastCheck, 10)) < 15 * 60 * 1000) {
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
    const isNewVersion = !storedVersion || storedVersion !== currentSha;
    
    console.log(`%c🔍 Version check: ${isNewVersion ? 'NEW VERSION DETECTED!' : 'No changes'}`, 
      `color: ${isNewVersion ? '#FF5722' : '#4CAF50'}; font-weight: bold`, {
      stored: storedVersion || 'none',
      current: currentSha,
      shortSha: versionData.shortSha,
      timestamp: versionData.timestamp,
      buildTime: versionData.buildTime,
      needsUpdate: isNewVersion
    });
    
    // If no stored version or versions don't match, update and return true
    if (isNewVersion) {
      localStorage.setItem(VERSION_KEY, currentSha);
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
 */
export const clearCachesIfNewVersion = async () => {
  try {
    const isNewVersion = await checkForNewVersion();
    
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
  // Check immediately on load
  clearCachesIfNewVersion();
  
  // Set up periodic checks (every 15 minutes)
  setInterval(() => {
    clearCachesIfNewVersion();
  }, 15 * 60 * 1000);
};

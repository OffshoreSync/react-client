import { clearFetchCache } from './apiUtils';

// Cache constants
const CACHE_NAME = 'offshoresync-cache-v2';
const VERSION_KEY = 'app_version';
const LAST_CHECK_KEY = 'version_last_check';
const VERSION_FILE_PATH = '/version.json';

/**
 * Gets the stored version from cache
 * @returns {Promise<string|null>} The stored version or null if not found
 */
export const getStoredVersion = async () => {
  try {
    if ('caches' in window) {
      const cache = await caches.open(CACHE_NAME);
      const response = await cache.match(VERSION_KEY);
      if (response) {
        const data = await response.json();
        return data.version;
      }
    }
    return null;
  } catch (error) {
    console.error('❌ Error getting stored version:', error);
    return null;
  }
};

/**
 * Sets the stored version in cache
 * @param {string} version - The version to store
 */
export const setStoredVersion = async (version) => {
  try {
    if ('caches' in window) {
      const cache = await caches.open(CACHE_NAME);
      const versionData = { version, timestamp: Date.now() };
      const response = new Response(JSON.stringify(versionData));
      await cache.put(VERSION_KEY, response);
      console.log('%c🔄 Updated stored version in cache to:', 'color: #2196F3; font-weight: bold', version);
    }
  } catch (error) {
    console.error('❌ Error setting stored version:', error);
  }
};

/**
 * Gets the last check timestamp from cache
 * @returns {Promise<number|null>} The timestamp or null if not found
 */
export const getLastCheckTime = async () => {
  try {
    if ('caches' in window) {
      const cache = await caches.open(CACHE_NAME);
      const response = await cache.match(LAST_CHECK_KEY);
      if (response) {
        const data = await response.json();
        return data.timestamp;
      }
    }
    return null;
  } catch (error) {
    console.error('❌ Error getting last check time:', error);
    return null;
  }
};

/**
 * Sets the last check timestamp in cache
 * @param {number} timestamp - The timestamp to store
 */
export const setLastCheckTime = async (timestamp) => {
  try {
    if ('caches' in window) {
      const cache = await caches.open(CACHE_NAME);
      const timeData = { timestamp };
      const response = new Response(JSON.stringify(timeData));
      await cache.put(LAST_CHECK_KEY, response);
    }
  } catch (error) {
    console.error('❌ Error setting last check time:', error);
  }
};

/**
 * Checks the current app version against the local version.json file
 * Returns true if a new version is available
 * @param {boolean} bypassCooldown - If true, bypass the 15-minute cooldown
 */
export const checkForNewVersion = async (bypassCooldown = false) => {
  try {
    // Don't check more than once every 15 minutes, unless bypassCooldown is true
    const lastCheck = await getLastCheckTime();
    const now = Date.now();
    
    if (!bypassCooldown && lastCheck && (now - lastCheck) < 15 * 60 * 1000) {
      console.log('🔄 Skipping version check - checked recently');
      return false;
    }
    
    // Update last check time
    await setLastCheckTime(now);
    
    // Get current stored version
    const storedVersion = await getStoredVersion();
    
    // Fetch the version.json file with cache-busting query parameter
    // The query parameter ensures the browser always makes a fresh request
    const response = await fetch(`${VERSION_FILE_PATH}?_=${now}`);
    
    if (!response.ok) {
      console.error('❌ Failed to fetch version info:', response.status);
      return false;
    }
    
    const versionData = await response.json();
    const currentSha = versionData.gitSha;
    
    // If no stored version yet (first visit), initialize it to prevent showing update on first visit
    if (!storedVersion) {
      console.log('%c🔍 First visit detected, initializing version', 'color: #4CAF50; font-weight: bold');
      await setStoredVersion(currentSha);
      return false;
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
    
    // If versions don't match, return true but DON'T update cache yet
    // We'll only update cache after the user completes the update process
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
      
      // Get the version data before clearing caches
      let versionData = null;
      try {
        const response = await fetch(`${VERSION_FILE_PATH}?_=${Date.now()}`);
        if (response.ok) {
          versionData = await response.json();
        }
      } catch (error) {
        console.error('Error fetching version data:', error);
      }
      
      // Clear cache storage
      if ('caches' in window) {
        console.log('%c🧹 Clearing service worker caches...', 'color: #FF9800; font-weight: bold');
        const cacheNames = await caches.keys();
        console.log('Found caches:', cacheNames);
        
        // Delete all caches except the version information
        await Promise.all(
          cacheNames.map(async cacheName => {
            if (cacheName === CACHE_NAME) {
              // For our main cache, we'll clear everything except version info
              const cache = await caches.open(cacheName);
              const keys = await cache.keys();
              await Promise.all(
                keys.map(request => {
                  // Don't delete our version keys
                  if (request.url.includes(VERSION_KEY) || request.url.includes(LAST_CHECK_KEY)) {
                    return Promise.resolve();
                  }
                  return cache.delete(request);
                })
              );
            } else {
              // Delete other caches completely
              return caches.delete(cacheName);
            }
          })
        );
      }
      
      // Clear localStorage except for critical items
      console.log('%c🧹 Clearing localStorage...', 'color: #FF9800; font-weight: bold');
      const keysToKeep = ['auth_token', 'refresh_token']; // Keep auth tokens
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
      
      // Update the stored version in cache
      if (versionData) {
        console.log('%c🔄 Updating stored version to:', 'color: #2196F3; font-weight: bold', versionData.gitSha);
        await setStoredVersion(versionData.gitSha);
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
  // Set up periodic checks (every 15 minutes)
  setInterval(() => {
    clearCachesIfNewVersion();
  }, 15 * 60 * 1000);
  
  // Schedule a version check after a short delay to allow the app to initialize
  // This won't update cache, just check if there's a new version
  setTimeout(() => {
    // Just check if there's a new version, don't update cache
    checkForNewVersion(true).then(isNewVersion => {
      if (isNewVersion) {
        console.log('%c🔍 New version detected on startup, update button will be shown', 'color: #FF5722; font-weight: bold');
      }
    });
  }, 3000); // Check after 3 seconds
};

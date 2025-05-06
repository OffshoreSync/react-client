import { clearFetchCache } from './apiUtils';

// Cache constants
const CACHE_NAME = 'offshoresync-cache-v2';
const VERSION_KEY = 'app_version';
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
 * Initialize the version tracking system by storing the current version in the cache
 * This should be called when the app starts
 */
export const initializeVersionTracking = async () => {
  try {
    // Check if we already have a stored version
    const storedVersion = await getStoredVersion();
    
    if (!storedVersion) {
      // Fetch the current version from version.json
      const response = await fetch(`${VERSION_FILE_PATH}?_=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Pragma': 'no-cache' }
      });
      
      if (response.ok) {
        const data = await response.json();
        // Store the current version in the cache
        await setStoredVersion(data.gitSha);
      }
    }
  } catch (error) {
    console.error('Error initializing version tracking:', error);
  }
};

// Note: checkForNewVersion function has been removed as it's redundant
// The UpdateButton component already handles version checking directly



/**
 * Clears all application caches and updates to the latest version
 * This is called directly by the UpdateButton when a user clicks to update
 */
export const clearCachesIfNewVersion = async () => {
  try {
    console.log('%c🆕 CLEARING CACHES FOR UPDATE', 'color: #FF5722; font-weight: bold; font-size: 14px; background: #FBE9E7; padding: 5px; border-radius: 3px;');
    
    // Clear fetch API caches
    console.log('%c🧹 Clearing fetch API caches...', 'color: #FF9800; font-weight: bold');
    clearFetchCache();
    
    // Get the version data before clearing caches
    let versionData = null;
    try {
      // Use cache-busting parameter but ensure we don't cache this URL
      const response = await fetch(`${VERSION_FILE_PATH}?_=${Date.now()}`, {
        cache: 'no-store',  // Ensure we don't cache this request
        headers: { 'Pragma': 'no-cache' }
      });
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
                // Don't delete our version keys but do delete any version.json requests with timestamps
                if (request.url.includes(VERSION_KEY)) {
                  return Promise.resolve();
                }
                // Make sure to delete any cached version.json requests with timestamps
                if (request.url.includes('version.json?_=')) {
                  return cache.delete(request);
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
  } catch (error) {
    console.error('❌ Error clearing caches:', error);
    return false;
  }
};

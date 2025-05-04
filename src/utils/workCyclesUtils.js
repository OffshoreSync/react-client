// Utility functions for managing work cycles

import { api, setCookie, getCookie } from './apiUtils';

// Cache keys
const CACHE_KEYS = {
  WORK_CYCLES: 'offshoresync_cache_workCycles',
  PROFILE: 'offshoresync_cache_profile',
  CALENDAR: 'offshoresync_cache_calendar',
  LAST_REFRESH: 'offshoresync_last_refresh',
  ONBOARD_DATE_CHANGED: 'offshoresync_onboard_date_changed'
};

/**
 * Clears all calendar and work cycles related cache
 */
export const clearCalendarCache = () => {
  try {
    console.log('%c🧹 Clearing calendar and work cycles cache', 'color: #9C27B0; font-weight: bold');
    
    // Clear specific cache items
    localStorage.removeItem(CACHE_KEYS.WORK_CYCLES);
    localStorage.removeItem(CACHE_KEYS.CALENDAR);
    
    // Find and clear any other related cache items
    const allKeys = Object.keys(localStorage);
    const relatedKeys = allKeys.filter(key => 
      key.includes('calendar') || 
      key.includes('workCycles') || 
      key.includes('cycles')
    );
    
    relatedKeys.forEach(key => {
      console.log(`Clearing related cache: ${key}`);
      localStorage.removeItem(key);
    });
    
    // Set a timestamp for the last cache refresh
    localStorage.setItem(CACHE_KEYS.LAST_REFRESH, Date.now().toString());
    
    return true;
  } catch (error) {
    console.error('Failed to clear calendar cache:', error);
    return false;
  }
};

/**
 * Fetches fresh work cycles from the server and updates the user object
 * This ensures that when navigating between pages, the work cycles are always up-to-date
 * @param {Object} user - The current user object
 * @param {Function} setUser - Function to update the user state
 * @param {Function} updateUserInCookies - Function to update user in cookies
 * @returns {Promise<Object>} - The updated user object with fresh work cycles
 */
export const refreshWorkCycles = async (user, setUser, updateUserInCookies) => {
  try {
    console.log('%c🔄 Refreshing work cycles...', 'color: #4CAF50; font-weight: bold');
    
    // Clear calendar cache first
    clearCalendarCache();
    
    // Fetch fresh work cycles from the server
    const cyclesResponse = await api.post('/auth/generate-work-cycles');
    
    if (cyclesResponse.data && cyclesResponse.data.workCycles) {
      console.log('%c✅ Work cycles refreshed successfully', 'color: #4CAF50');
      
      // Create updated user object with new work cycles
      const updatedUser = {
        ...user,
        workCycles: cyclesResponse.data.workCycles
      };
      
      // Update user in cookies and state if functions are provided
      if (updateUserInCookies) {
        updateUserInCookies(updatedUser);
      }
      
      if (setUser) {
        setUser(updatedUser);
      }
      
      // Store the updated work cycles in localStorage for immediate access
      try {
        localStorage.setItem('workCycles', JSON.stringify(cyclesResponse.data.workCycles));
      } catch (storageError) {
        console.warn('Failed to store work cycles in localStorage:', storageError);
      }
      
      return updatedUser;
    }
    
    return user;
  } catch (error) {
    console.error('Failed to refresh work cycles:', error);
    return user;
  }
};

/**
 * Refreshes the profile data to ensure it's up-to-date
 * This is useful after changing the onboard date
 * @returns {Promise<void>}
 */
export const refreshProfileData = async () => {
  try {
    console.log('%c🔄 Refreshing profile data...', 'color: #2196F3; font-weight: bold');
    
    // Use cache-control headers to force revalidation
    // This ensures we always get fresh data from the server
    const { fetchWithRevalidation } = await import('../utils/apiUtils');
    const response = await fetchWithRevalidation('/auth/profile');
    
    if (response.data && response.data.user) {
      console.log('%c✅ Profile data refreshed successfully', 'color: #2196F3');
      
      // Update user in cookies
      setCookie('user', JSON.stringify(response.data.user));
      
      // Clear profile cache
      localStorage.removeItem(CACHE_KEYS.PROFILE);
      
      return response.data.user;
    }
    
    console.log('Profile data refresh completed, but no user data returned');
    return null;
  } catch (error) {
    console.error('Failed to refresh profile data:', error);
    return null;
  }
};

/**
 * Force updates all calendar-related data with a delay
 * This ensures the calendar is properly refreshed after setting a new onboard date
 * @param {Object} user - The current user object
 * @param {Function} setUser - Function to update the user state
 * @param {Function} updateUserInCookies - Function to update user in cookies
 * @param {number} delayMs - Delay in milliseconds before refreshing (default: 2000ms)
 * @returns {Promise<void>}
 */
export const forceCalendarUpdate = async (user, setUser, updateUserInCookies, delayMs = 2000) => {
  console.log(`%c⏱️ Scheduling calendar update in ${delayMs}ms`, 'color: #FF9800; font-weight: bold');
  
  // Clear calendar cache immediately
  clearCalendarCache();
  
  // Schedule the refresh after the specified delay
  return new Promise(resolve => {
    setTimeout(async () => {
      try {
        console.log('%c🔄 Executing delayed calendar update', 'color: #FF9800');
        
        // Try to refresh work cycles directly first (more reliable)
        let updatedUser;
        try {
          // Get fresh work cycles
          const cyclesResponse = await api.post('/auth/generate-work-cycles');
          
          if (cyclesResponse.data && cyclesResponse.data.workCycles) {
            // Create updated user object with new work cycles
            updatedUser = {
              ...user,
              workCycles: cyclesResponse.data.workCycles
            };
            
            // Update user in cookies and state if functions are provided
            if (updateUserInCookies) {
              updateUserInCookies(updatedUser);
            }
            
            if (setUser) {
              setUser(updatedUser);
            }
            
            // Store the updated work cycles in localStorage for immediate access
            try {
              localStorage.setItem('workCycles', JSON.stringify(cyclesResponse.data.workCycles));
            } catch (storageError) {
              console.warn('Failed to store work cycles in localStorage:', storageError);
            }
          }
        } catch (cyclesError) {
          console.warn('Failed to refresh work cycles directly:', cyclesError);
          // Fall back to profile refresh if direct work cycles refresh fails
          try {
            // Try to refresh profile data
            const updatedProfile = await refreshProfileData();
            if (updatedProfile) {
              updatedUser = updatedProfile;
            }
          } catch (profileError) {
            console.warn('Failed to refresh profile as fallback:', profileError);
          }
        }
        
        // Dispatch an event to notify components that calendar data has been updated
        window.dispatchEvent(new CustomEvent('calendar-data-updated', {
          detail: { timestamp: Date.now() }
        }));
        
        console.log('%c✅ Forced calendar update completed', 'color: #FF9800');
        resolve(updatedUser || user);
      } catch (error) {
        console.error('Error during forced calendar update:', error);
        resolve(user); // Return original user on error
      }
    }, delayMs);
  });
};

/**
 * Sets a timestamp when the onboard date was changed
 * This is used to detect when we need to force refresh data
 * Also invalidates the profile cache to ensure fresh data is loaded
 */
export const markOnboardDateChanged = async () => {
  try {
    const timestamp = Date.now();
    localStorage.setItem(CACHE_KEYS.ONBOARD_DATE_CHANGED, timestamp.toString());
    console.log(`%c🔖 Marked onboard date changed at ${new Date(timestamp).toISOString()}`, 'color: #FF5722; font-weight: bold');
    
    // Clear profile cache explicitly
    localStorage.removeItem(CACHE_KEYS.PROFILE);
    
    // Force a profile refresh to ensure we get fresh data
    try {
      console.log('%c🔄 Invalidating profile cache after onboard date change', 'color: #FF5722; font-weight: bold');
      await refreshProfileData();
    } catch (refreshError) {
      console.warn('Failed to refresh profile after onboard date change:', refreshError);
      // Continue even if refresh fails - the timestamp is still set
    }
    
    return timestamp;
  } catch (error) {
    console.error('Failed to mark onboard date change:', error);
    return null;
  }
};

/**
 * Checks if the onboard date was changed since the last page load
 * @returns {boolean} - True if onboard date was changed recently
 */
export const wasOnboardDateChanged = () => {
  try {
    const timestamp = localStorage.getItem(CACHE_KEYS.ONBOARD_DATE_CHANGED);
    if (!timestamp) return false;
    
    // Consider it changed if it was updated in the last hour
    const changeTime = parseInt(timestamp, 10);
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    
    return changeTime > oneHourAgo;
  } catch (error) {
    console.error('Failed to check if onboard date was changed:', error);
    return false;
  }
};

/**
 * Clears the onboard date changed marker
 */
export const clearOnboardDateChangedMarker = () => {
  try {
    localStorage.removeItem(CACHE_KEYS.ONBOARD_DATE_CHANGED);
    console.log('%c🧹 Cleared onboard date changed marker', 'color: #9C27B0');
    return true;
  } catch (error) {
    console.error('Failed to clear onboard date changed marker:', error);
    return false;
  }
};

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
      setCookie('user', response.data.user);
      
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

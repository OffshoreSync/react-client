// Utility functions for managing work cycles

import { api } from './apiUtils';

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
    console.log('Refreshing work cycles...');
    
    // Fetch fresh work cycles from the server
    const cyclesResponse = await api.post('/auth/generate-work-cycles');
    
    if (cyclesResponse.data && cyclesResponse.data.workCycles) {
      console.log('Work cycles refreshed successfully');
      
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
    console.log('Refreshing profile data...');
    
    // Make a fresh request to profile endpoint with cache-busting headers
    await api.get('/api/auth/profile', {
      headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
      params: { _t: new Date().getTime() } // Add timestamp to bust cache
    });
    
    console.log('Profile data refreshed successfully');
  } catch (error) {
    console.error('Failed to refresh profile data:', error);
  }
};

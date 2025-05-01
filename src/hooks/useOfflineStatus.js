import { useState, useEffect } from 'react';

export const useOfflineStatus = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    // Create a broadcast channel to listen for offline/online events
    const statusChannel = new BroadcastChannel('offshoresync-status');

    const handleMessage = (event) => {
      setIsOffline(event.data.type === 'offline');
    };

    // Listen to broadcast channel messages
    statusChannel.addEventListener('message', handleMessage);

    // Initial state check
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Cleanup
    return () => {
      statusChannel.removeEventListener('message', handleMessage);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOffline;
};

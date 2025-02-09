const getBackendUrl = (path = '') => {
  // Use environment variable for backend URL, fallback to localhost
  const baseUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
  
  // Remove trailing slash from baseUrl and leading slash from path
  const cleanBaseUrl = baseUrl.replace(/\/+$/, '');
  const cleanPath = path.replace(/^\/+/, '');
  
  // Combine with a single slash
  return cleanPath ? `${cleanBaseUrl}/${cleanPath}` : cleanBaseUrl;
};

export default getBackendUrl;

const getBackendUrl = (path = '') => {
  // Use environment variable for backend URL, fallback to localhost
  const baseUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
  
  // Ensure path starts with a slash
  const formattedPath = path.startsWith('/') ? path : `/${path}`;
  
  return `${baseUrl}${formattedPath}`;
};

export default getBackendUrl;

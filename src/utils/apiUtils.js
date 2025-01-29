const getBackendUrl = (endpoint) => {
  const baseUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
  return `${baseUrl}${endpoint}`;
};

export default getBackendUrl;

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is logged in
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');

    if (!storedUser || !token) {
      // Redirect to login if no user or token
      navigate('/login');
      return;
    }

    // Parse and set user
    try {
      setUser(JSON.parse(storedUser));
    } catch (error) {
      console.error('Error parsing user data', error);
      navigate('/login');
    }
  }, [navigate]);

  // If no user, return null to prevent rendering
  if (!user) return null;

  return (
    <div className="dashboard-container">
      <h1>Hello, {user.fullName}!</h1>
      <p>Welcome to Offshore Working Regime Calculator</p>
      <div className="user-details">
        <h2>Your Profile</h2>
        <p>Username: {user.username}</p>
        <p>Email: {user.email}</p>
        <p>Offshore Role: {user.offshoreRole}</p>
      </div>
      <button 
        onClick={() => {
          // Logout functionality
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          navigate('/login');
        }}
        className="logout-button"
      >
        Logout
      </button>
    </div>
  );
};

export default Dashboard;

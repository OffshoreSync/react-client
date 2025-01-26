import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { OFFSHORE_COUNTRIES } from '../utils/countries';

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
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
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
    } catch (error) {
      console.error('Error parsing user data', error);
      // Clear invalid localStorage and redirect
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      navigate('/login');
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleDeleteAccount = async () => {
    try {
      const token = localStorage.getItem('token');
      
      await axios.delete('http://localhost:5000/api/auth/delete-account', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      // Clear local storage and redirect
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      navigate('/');
    } catch (error) {
      console.error('Account deletion failed', error);
      alert('Failed to delete account. Please try again.');
    }
  };

  // Find country code for display
  const getCountryCode = (countryName) => {
    if (!countryName) return 'N/A';
    const country = OFFSHORE_COUNTRIES.find(c => c.name === countryName);
    return country ? country.code : 'N/A';
  };

  // Format working regime display
  const formatWorkingRegime = (regime) => {
    // Defensive check for regime
    if (!regime || typeof regime !== 'object') {
      return 'Not Specified';
    }

    // Check if it's a predefined regime
    const predefinedRegimes = {
      '7/7': { onDutyDays: 7, offDutyDays: 7 },
      '14/14': { onDutyDays: 14, offDutyDays: 14 },
      '28/28': { onDutyDays: 28, offDutyDays: 28 }
    };

    const matchedPredefined = Object.entries(predefinedRegimes).find(
      ([, value]) => value.onDutyDays === regime.onDutyDays && 
                     value.offDutyDays === regime.offDutyDays
    );

    if (matchedPredefined) {
      return `${matchedPredefined[0]} (Predefined)`;
    }

    // Validate custom regime
    if (!regime.onDutyDays || !regime.offDutyDays) {
      return 'Invalid Regime';
    }

    return `${regime.onDutyDays} Days On / ${regime.offDutyDays} Days Off (Custom)`;
  };

  // If no user, return null to prevent rendering
  if (!user) return null;

  return (
    <div className="dashboard-container">
      <h1>Hello, {user.fullName || 'User'}!</h1>
      <p>Welcome to Offshore Working Regime Calculator</p>
      <div className="user-details">
        <h2>Your Profile</h2>
        <p>Username: {user.username || 'N/A'}</p>
        <p>Email: {user.email || 'N/A'}</p>
        <p>Offshore Role: {user.offshoreRole || 'Not Specified'}</p>
        <p>Working Regime: {formatWorkingRegime(user.workingRegime)}</p>
        {user.company && <p>Company: {user.company}</p>}
        {user.unitName && <p>Unit Name: {user.unitName}</p>}
        <p>Country: {user.country || 'N/A'} ({getCountryCode(user.country)})</p>
      </div>
      
      <div className="dashboard-actions">
        <button 
          onClick={handleLogout}
          className="logout-button"
        >
          Logout
        </button>
        
        {!showDeleteConfirm ? (
          <button 
            onClick={() => setShowDeleteConfirm(true)}
            className="delete-account-button"
          >
            Delete Account
          </button>
        ) : (
          <div className="delete-confirm">
            <p>Are you sure you want to delete your account? This action cannot be undone.</p>
            <button 
              onClick={handleDeleteAccount}
              className="confirm-delete-button"
            >
              Confirm Delete
            </button>
            <button 
              onClick={() => setShowDeleteConfirm(false)}
              className="cancel-delete-button"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;

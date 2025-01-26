import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  Container, 
  Typography, 
  Box, 
  Button, 
  Paper, 
  Grid, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogContentText, 
  DialogActions, 
  Link 
} from '@mui/material';
import { OFFSHORE_COUNTRIES } from '../utils/countries';

const ProfileSettings = () => {
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
    <Container maxWidth="md">
      <Box sx={{ my: 4 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography variant="h4" gutterBottom>
            Profile Settings
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="h6">Personal Information</Typography>
              <Box sx={{ mt: 2 }}>
                <Typography variant="body1">
                  <strong>Full Name:</strong> {user.fullName || 'N/A'}
                </Typography>
                <Typography variant="body1">
                  <strong>Username:</strong> {user.username || 'N/A'}
                </Typography>
                <Typography variant="body1">
                  <strong>Email:</strong> {user.email || 'N/A'}
                </Typography>
              </Box>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Typography variant="h6">Professional Details</Typography>
              <Box sx={{ mt: 2 }}>
                <Typography variant="body1">
                  <strong>Offshore Role:</strong> {user.offshoreRole || 'Not Specified'}
                </Typography>
                <Typography variant="body1">
                  <strong>Working Regime:</strong> {formatWorkingRegime(user.workingRegime)}
                </Typography>
                {user.company && (
                  <Typography variant="body1">
                    <strong>Company:</strong> {user.company}
                  </Typography>
                )}
                {user.unitName && (
                  <Typography variant="body1">
                    <strong>Unit Name:</strong> {user.unitName}
                  </Typography>
                )}
                <Typography variant="body1">
                  <strong>Country:</strong> {user.country || 'N/A'} ({getCountryCode(user.country)})
                </Typography>
              </Box>
            </Grid>
          </Grid>
          
          <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between' }}>
            <Link href="/edit-profile" underline="none">
              <Button 
                variant="contained" 
                color="primary"
              >
                Edit Profile
              </Button>
            </Link>
            
            <Button 
              variant="contained" 
              color="secondary"
              onClick={handleLogout}
            >
              Logout
            </Button>
            
            <Button 
              variant="outlined" 
              color="error"
              onClick={() => setShowDeleteConfirm(true)}
            >
              Delete Account
            </Button>
          </Box>
        </Paper>
        
        <Dialog
          open={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
        >
          <DialogTitle>Delete Account</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to delete your account? This action cannot be undone.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowDeleteConfirm(false)} color="primary">
              Cancel
            </Button>
            <Button onClick={handleDeleteAccount} color="error" autoFocus>
              Confirm Delete
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};

export default ProfileSettings;

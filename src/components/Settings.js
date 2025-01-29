import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import ReactCountryFlag from "react-country-flag";
import { 
  Typography, 
  Box, 
  Grid, 
  Paper, 
  Button, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogContentText,
  DialogActions, 
  Link,
  Container
} from '@mui/material';
import { getCountryCode } from '../utils/countries';
import { useTranslation } from 'react-i18next';
import getBackendUrl from '../utils/apiUtils';

const Settings = () => {
  const [user, setUser] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();

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
      // Detailed logging of stored user data
      console.log('Raw Stored User JSON:', storedUser);
      
      const parsedUser = JSON.parse(storedUser);
      
      // Add comprehensive logging to verify user data
      console.log('Parsed User Data:', JSON.stringify(parsedUser, null, 2));
      
      // Explicitly check and log specific fields
      console.log('Specific Field Check:', {
        hasUnitName: 'unitName' in parsedUser,
        hasCountry: 'country' in parsedUser,
        unitNameValue: parsedUser.unitName,
        countryValue: parsedUser.country,
        unitNameType: typeof parsedUser.unitName,
        countryType: typeof parsedUser.country
      });

      // Defensive parsing to ensure fields are present
      const safeUser = {
        ...parsedUser,
        unitName: parsedUser.unitName || null,
        country: parsedUser.country || null
      };
      
      setUser(safeUser);
    } catch (error) {
      console.error('Error parsing user data', error);
      
      // Log the raw stored user data for investigation
      console.error('Stored User Data:', storedUser);
      
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
      
      await axios.delete(
        getBackendUrl('/api/auth/delete-account'), 
        { 
          headers: { 
            Authorization: `Bearer ${token}` 
          } 
        }
      );

      // Clear local storage
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      // Dispatch event to update profile picture
      window.dispatchEvent(new Event('profilePictureUpdated'));

      // Reload the page to clear all state
      window.location.href = '/';
    } catch (error) {
      console.error('Account deletion error:', error);
      alert('Failed to delete account. Please try again.');
    }
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
        <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
          <Typography variant="h4" gutterBottom>
            {t('settings.profileSettings')}
          </Typography>

          {user ? (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6">
                  {t('settings.personalInformation')}
                </Typography>
                <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <Typography variant="body1">
                    <strong>{t('settings.fullName')}:</strong> {user.fullName || t('settings.notSet')}
                  </Typography>
                  <Typography variant="body1">
                    <strong>{t('settings.username')}:</strong> {user.username || t('settings.notSet')}
                  </Typography>
                  <Typography variant="body1">
                    <strong>{t('settings.email')}:</strong> {user.email || t('settings.notSet')}
                  </Typography>
                  {user.country ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Typography variant="body1">
                        <strong>{t('settings.country')}:</strong> {t(`countries.${user.country}`)}
                      </Typography>
                      <ReactCountryFlag
                        countryCode={user.country}
                        svg
                        style={{
                          width: '2em',
                          height: '1.5em',
                          borderRadius: '4px'
                        }}
                        title={t(`countries.${user.country}`)}
                      />
                    </Box>
                  ) : (
                    <Typography variant="body1">
                      <strong>{t('settings.country')}:</strong> {t('settings.noCountrySelected')}
                    </Typography>
                  )}
                </Box>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography variant="h6">
                  {t('settings.professionalDetails')}
                </Typography>
                <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <Typography variant="body1">
                    <strong>{t('settings.offshoreRole')}:</strong> {
                      user.offshoreRole 
                        ? t(`offshoreRoles.${user.offshoreRole.toLowerCase()}`) 
                        : t('settings.notSet')
                    }
                  </Typography>
                  <Typography variant="body1">
                    <strong>{t('settings.workingRegime')}:</strong> {
                      user.workingRegime 
                        ? `${user.workingRegime.onDutyDays}/${user.workingRegime.offDutyDays}` 
                        : t('settings.notSet')
                    }
                  </Typography>
                  {user.company && (
                    <Typography variant="body1">
                      <strong>{t('settings.company')}:</strong> {user.company}
                    </Typography>
                  )}
                  {user.unitName && (
                    <Typography variant="body1">
                      <strong>{t('settings.unitName')}:</strong> {user.unitName}
                    </Typography>
                  )}
                </Box>
              </Grid>
            </Grid>
          ) : (
            <Typography>{t('settings.loading')}</Typography>
          )}

          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
            <Button 
              variant="contained" 
              color="primary" 
              onClick={() => navigate('/edit-profile')}
            >
              {t('settings.editProfile')}
            </Button>
            
            <Button 
              variant="outlined" 
              color="error" 
              onClick={() => setShowDeleteConfirm(true)}
            >
              {t('settings.deleteAccount')}
            </Button>
          </Box>

          <Dialog
            open={showDeleteConfirm}
            onClose={() => setShowDeleteConfirm(false)}
            aria-labelledby="alert-dialog-title"
            aria-describedby="alert-dialog-description"
          >
            <DialogTitle id="alert-dialog-title">
              {t('settings.confirmDeleteAccount')}
            </DialogTitle>
            <DialogContent>
              <DialogContentText id="alert-dialog-description">
                {t('settings.deleteAccountWarning')}
              </DialogContentText>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setShowDeleteConfirm(false)} color="primary">
                {t('settings.cancel')}
              </Button>
              <Button onClick={handleDeleteAccount} color="error" autoFocus>
                {t('settings.confirmDelete')}
              </Button>
            </DialogActions>
          </Dialog>
        </Paper>
      </Box>
    </Container>
  );
};

export default Settings;

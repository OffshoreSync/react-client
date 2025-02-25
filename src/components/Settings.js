import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { api, getCookie, removeCookie, setCookie } from '../utils/apiUtils';

const Settings = () => {
  const [user, setUser] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await api.get('/api/auth/profile');
        if (response.data.user) {
          setUser(response.data.user);
          // Update the user cookie with fresh data
          setCookie('user', response.data.user);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        if (error.response?.status === 401) {
          navigate('/login');
        }
      }
    };

    fetchUserData();
  }, [navigate]);

  const handleLogout = () => {
    removeCookie('token');
    removeCookie('user');
    navigate('/login');
  };

  const handleDeleteAccount = async () => {
    try {
      await api.delete('/api/auth/delete-account');

      // Clear cookies
      removeCookie('token');
      removeCookie('user');

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
      return `${matchedPredefined[0]}`;
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
                        ? formatWorkingRegime(user.workingRegime) 
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

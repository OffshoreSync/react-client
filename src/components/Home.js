import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  Container, 
  Typography, 
  Box, 
  Button, 
  Grid, 
  Paper, 
  List, 
  ListItem, 
  ListItemIcon, 
  ListItemText,
  Alert,
  AlertTitle
} from '@mui/material';
import WorkIcon from '@mui/icons-material/Work';
import SecurityIcon from '@mui/icons-material/Security';
import GoogleIcon from '@mui/icons-material/Google';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import EventIcon from '@mui/icons-material/Event';
import TranslateIcon from '@mui/icons-material/Translate';
import { getCookie, removeCookie } from '../utils/apiUtils';

import { clearAuthAndRedirect } from '../utils/apiUtils';

function Home() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Listen for auth state changes
  useEffect(() => {
    const handleAuthChange = (event) => {
      const { isAuthenticated } = event.detail;
      setIsLoggedIn(isAuthenticated);
      if (isAuthenticated) {
        navigate('/dashboard');
      }
    };

    window.addEventListener('auth-state-changed', handleAuthChange);
    return () => window.removeEventListener('auth-state-changed', handleAuthChange);
  }, [navigate]);

  // Initial auth check
  useEffect(() => {
    const checkAuth = () => {
      const token = getCookie('token');
      const user = getCookie('user');
      const isAuth = !!token && !!user;
      
      setIsLoggedIn(isAuth);
      setIsCheckingAuth(false);

      if (isAuth) {
        navigate('/dashboard');
      }
    };

    // Small delay to allow potential token refresh to complete
    const timeoutId = setTimeout(checkAuth, 500);
    return () => clearTimeout(timeoutId);
  }, [navigate]);

  const handleLogin = () => {
    navigate('/login');
  };

  const handleRegister = () => {
    navigate('/register');
  };

  const handleLogout = () => {
    clearAuthAndRedirect('/');
    setIsLoggedIn(false);
  };

  const handleDashboard = () => {
    navigate('/dashboard');
  };

  return (
    <Container 
      maxWidth="lg" 
      sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: 'calc(100vh - 64px)', // Subtract navbar height
        backgroundColor: 'background.default',
        py: 4 
      }}
    >
      <Box sx={{ 
        textAlign: 'center', 
        maxWidth: 800,
        width: '100%',
        backgroundColor: 'background.paper',
        borderRadius: 2,
        boxShadow: 3,
        p: 4
      }}>
        <Typography 
          variant="h4" 
          gutterBottom 
          sx={{ 
            color: 'primary.main', 
            mb: 3,
            fontWeight: 'bold'
          }}
        >
          {t('home.title')}
        </Typography>
        
        <Typography 
          variant="body1" 
          paragraph 
          sx={{ 
            color: 'text.secondary', 
            mb: 4 
          }}
        >
          {t('home.subtitle')}
        </Typography>
        
        {/* Google Login Support Alert */}
        <Box sx={{ mb: 3 }}>
          <Alert 
            icon={<GoogleIcon />} 
            severity="info" 
            variant="outlined"
          >
            <AlertTitle>{t('home.googleLogin.title')}</AlertTitle>
            {t('home.googleLogin.description')}
          </Alert>
        </Box>
        
        <Grid container spacing={3} justifyContent="center">
          <Grid item xs={12}>
            <Paper 
              elevation={2} 
              sx={{ 
                p: 3, 
                backgroundColor: 'background.paper' 
              }}
            >
              <Typography 
                variant="h5" 
                gutterBottom 
                sx={{ 
                  color: 'text.primary', 
                  mb: 2 
                }}
              >
                {t('home.keyFeaturesTitle')}
              </Typography>
              
              <List>
                {[
                  {
                    icon: <WorkIcon color="primary" />,
                    primary: t('home.features.flexibleWork.title'),
                    secondary: t('home.features.flexibleWork.description')
                  },
                  {
                    icon: <SecurityIcon color="primary" />,
                    primary: t('home.features.authentication.title'),
                    secondary: t('home.features.authentication.description')
                  },
                  {
                    icon: <GroupAddIcon color="primary" />,
                    primary: t('home.features.friendship.title'),
                    secondary: t('home.features.friendship.description')
                  },
                  {
                    icon: <EventIcon color="primary" />,
                    primary: t('home.features.events.title'),
                    secondary: t('home.features.events.description')
                  },
                  {
                    icon: <TranslateIcon color="primary" />,
                    primary: t('home.features.localization.title'),
                    secondary: t('home.features.localization.description')
                  }
                ].map((feature, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>{feature.icon}</ListItemIcon>
                    <ListItemText 
                      primary={feature.primary} 
                      secondary={feature.secondary}
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>
          </Grid>
        </Grid>
        
        <Box sx={{ 
          mt: 4, 
          display: 'flex', 
          justifyContent: 'center', 
          gap: 2,
          flexWrap: 'wrap'
        }}>
          {!isLoggedIn ? (
            <>
              <Button 
                variant="contained" 
                color="primary" 
                size="large"
                onClick={handleLogin}
                sx={{ minWidth: 200 }}
              >
                {t('home.loginButton')}
              </Button>
              
              <Button 
                variant="outlined" 
                color="primary" 
                size="large"
                onClick={handleRegister}
                sx={{ minWidth: 200 }}
              >
                {t('home.registerButton')}
              </Button>
            </>
          ) : (
            <>
              <Button 
                variant="contained" 
                color="primary" 
                size="large"
                onClick={handleDashboard}
                sx={{ minWidth: 200 }}
              >
                {t('home.dashboardButton')}
              </Button>
              
              <Button 
                variant="contained" 
                color="error" 
                size="large"
                onClick={handleLogout}
                sx={{ minWidth: 200 }}
              >
                {t('home.logoutButton')}
              </Button>
            </>
          )}
        </Box>
      </Box>
    </Container>
  );
}

export default Home;

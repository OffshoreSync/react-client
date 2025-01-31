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
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import WorkIcon from '@mui/icons-material/Work';
import SecurityIcon from '@mui/icons-material/Security';
import PublicIcon from '@mui/icons-material/Public';
import GoogleIcon from '@mui/icons-material/Google';

function Home() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    setIsLoggedIn(!!token && !!user);
  }, []);

  const handleLogin = () => {
    navigate('/login');
  };

  const handleRegister = () => {
    navigate('/register');
  };

  const handleLogout = () => {
    // Clear localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Redirect to home page
    navigate('/');
    
    // Update login state
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
            color: 'text.primary', 
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
            <AlertTitle>Google Login Now Available</AlertTitle>
            You can now log in using your Google account through the login page. 
            Simply click the "Sign in with Google" button on the login screen.
          </Alert>
        </Box>
        
        <Grid container spacing={3} justifyContent="center">
          <Grid item xs={12}>
            <Paper 
              elevation={2} 
              sx={{ 
                p: 3, 
                backgroundColor: 'white' 
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
                    icon: <CheckCircleOutlineIcon color="primary" />,
                    primary: t('home.features.workManagement.title'),
                    secondary: t('home.features.workManagement.description')
                  },
                  {
                    icon: <SecurityIcon color="primary" />,
                    primary: t('home.features.authentication.title'),
                    secondary: t('home.features.authentication.description')
                  },
                  {
                    icon: <WorkIcon color="primary" />,
                    primary: t('home.features.roleBasedAccess.title'),
                    secondary: t('home.features.roleBasedAccess.description')
                  },
                  {
                    icon: <PublicIcon color="primary" />,
                    primary: t('home.features.globalSupport.title'),
                    secondary: t('home.features.globalSupport.description')
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

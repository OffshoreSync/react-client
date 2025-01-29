import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  ListItemText 
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import WorkIcon from '@mui/icons-material/Work';
import SecurityIcon from '@mui/icons-material/Security';
import PublicIcon from '@mui/icons-material/Public';

function Home() {
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
          Manage Your Offshore Working Regime
        </Typography>
        
        <Typography 
          variant="body1" 
          paragraph 
          sx={{ 
            color: 'text.secondary', 
            mb: 4 
          }}
        >
          Our application is designed specifically for offshore industry professionals 
          to track and manage their complex working schedules. Whether you're in drilling, 
          production, maintenance, or support roles, we provide a comprehensive solution 
          for your unique work-life balance.
        </Typography>
        
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
                Key Features
              </Typography>
              
              <List>
                {[
                  {
                    icon: <CheckCircleOutlineIcon color="primary" />,
                    primary: "Flexible Working Regimes",
                    secondary: "Choose from predefined 7/7, 14/14, 28/28 schedules or create a custom regime"
                  },
                  {
                    icon: <SecurityIcon color="primary" />,
                    primary: "User Authentication",
                    secondary: "Secure registration and login with personalized dashboards"
                  },
                  {
                    icon: <WorkIcon color="primary" />,
                    primary: "Role-Based Access",
                    secondary: "Tailored experience for different offshore roles"
                  },
                  {
                    icon: <PublicIcon color="primary" />,
                    primary: "Global Offshore Support",
                    secondary: "Works with offshore professionals from multiple countries"
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
                Login to Your Account
              </Button>
              
              <Button 
                variant="outlined" 
                color="primary" 
                size="large"
                onClick={handleRegister}
                sx={{ minWidth: 200 }}
              >
                Create New Account
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
                Go to Dashboard
              </Button>
              
              <Button 
                variant="contained" 
                color="error" 
                size="large"
                onClick={handleLogout}
                sx={{ minWidth: 200 }}
              >
                Logout from Your Account
              </Button>
            </>
          )}
        </Box>
      </Box>
    </Container>
  );
}

export default Home;

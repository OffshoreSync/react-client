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
    <Container maxWidth="lg">
      <Box sx={{ 
        textAlign: 'center', 
        my: 8, 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center' 
      }}>
        <Typography variant="h2" gutterBottom>
          Offshore Worker Calendar
        </Typography>
        
        <Paper elevation={3} sx={{ p: 4, mb: 4, maxWidth: 800, width: '100%' }}>
          <Typography variant="h5" gutterBottom>
            Manage Your Offshore Working Regime
          </Typography>
          
          <Typography variant="body1" paragraph>
            Our application is designed specifically for offshore industry professionals 
            to track and manage their complex working schedules. Whether you're in drilling, 
            production, maintenance, or support roles, we provide a comprehensive solution 
            for your unique work-life balance.
          </Typography>
        </Paper>
        
        <Grid container spacing={3} justifyContent="center">
          <Grid item xs={12} md={10}>
            <Paper elevation={2} sx={{ p: 3 }}>
              <Typography variant="h5" gutterBottom>
                Key Features
              </Typography>
              
              <List>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircleOutlineIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Flexible Working Regimes" 
                    secondary="Choose from predefined 7/7, 14/14, 28/28 schedules or create a custom regime"
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>
                    <SecurityIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="User Authentication" 
                    secondary="Secure registration and login with personalized dashboards"
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>
                    <WorkIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Role-Based Access" 
                    secondary="Tailored experience for different offshore roles"
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>
                    <PublicIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Global Offshore Support" 
                    secondary="Works with offshore professionals from multiple countries"
                  />
                </ListItem>
              </List>
            </Paper>
          </Grid>
        </Grid>
        
        <Box sx={{ mt: 4, display: 'flex', gap: 2 }}>
          {!isLoggedIn ? (
            <>
              <Button 
                variant="contained" 
                color="primary" 
                size="large"
                onClick={handleLogin}
              >
                Login to Your Account
              </Button>
              
              <Button 
                variant="outlined" 
                color="primary" 
                size="large"
                onClick={handleRegister}
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
              >
                Go to Dashboard
              </Button>
              
              <Button 
                variant="contained" 
                color="error" 
                size="large"
                onClick={handleLogout}
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

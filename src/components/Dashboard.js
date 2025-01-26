import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Container, 
  Typography, 
  Box, 
  Paper, 
  Grid 
} from '@mui/material';

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

  // If no user, return null to prevent rendering
  if (!user) return null;

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography variant="h4" gutterBottom>
            Dashboard
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6">
                Welcome, {user.fullName || 'User'}!
              </Typography>
              <Typography variant="body1" paragraph>
                Calendar feature coming soon. This is a placeholder for your offshore working calendar.
              </Typography>
            </Grid>
          </Grid>
        </Paper>
      </Box>
    </Container>
  );
};

export default Dashboard;

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { 
  Container, 
  Typography, 
  Box, 
  Paper, 
  Grid,
  styled 
} from '@mui/material';

// Custom styled calendar to match Material-UI theme
const StyledCalendar = styled(Calendar)`
  width: 100%;
  max-width: 600px;
  background: white;
  border: 1px solid #a0a0a0;
  font-family: Arial, Helvetica, sans-serif;
  line-height: 1.125em;

  .react-calendar__tile {
    max-width: 100%;
    padding: 10px 6.6667px;
    background: none;
    text-align: center;
    line-height: 16px;
  }

  .react-calendar__tile:enabled:hover,
  .react-calendar__tile:enabled:focus {
    background-color: #e6e6e6;
  }

  .react-calendar__tile--now {
    background: #ffff76;
  }

  .react-calendar__tile--active {
    background: #006edc;
    color: white;
  }
`;

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [date, setDate] = useState(new Date());
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

  const onChange = (newDate) => {
    setDate(newDate);
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography variant="h4" gutterBottom>
            Dashboard
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="h6">
                Welcome, {user.fullName || 'User'}!
              </Typography>
              <Typography variant="body1" paragraph>
                Your Offshore Working Calendar
              </Typography>
            </Grid>
            
            <Grid item xs={12}>
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'center', 
                width: '100%' 
              }}>
                <StyledCalendar
                  onChange={onChange}
                  value={date}
                  showNeighboringMonth={false}
                />
              </Box>
            </Grid>
            
            <Grid item xs={12}>
              <Typography variant="body1">
                Selected Date: {date.toLocaleDateString()}
              </Typography>
            </Grid>
          </Grid>
        </Paper>
      </Box>
    </Container>
  );
};

export default Dashboard;

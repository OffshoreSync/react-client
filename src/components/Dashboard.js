import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { 
  Container, 
  Typography, 
  Box, 
  Paper, 
  Grid,
  Button,
  useMediaQuery,
  styled,
  useTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Snackbar,
  Alert
} from '@mui/material';
import { 
  ChevronLeft as ChevronLeftIcon, 
  ChevronRight as ChevronRightIcon 
} from '@mui/icons-material';

// Custom styled calendar to match Material-UI theme
const StyledCalendar = styled(Calendar)`
  width: 350px !important;
  max-width: 350px !important;
  background: white;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  font-family: 'Roboto', 'Helvetica', 'Arial', sans-serif;
  
  /* Prevent stretching */
  .react-calendar__month-view {
    width: 100% !important;
  }

  .react-calendar__month-view__days {
    height: 250px !important;
  }

  /* Navigation */
  .react-calendar__navigation {
    display: flex;
    height: 44px;
    margin-bottom: 1em;
    background-color: transparent;
    border-bottom: 1px solid #e0e0e0;
  }

  .react-calendar__navigation button {
    min-width: 44px;
    background: none;
    color: rgba(0, 0, 0, 0.87);
    border: none;
    text-transform: uppercase;
    font-weight: 500;
    font-size: 0.875rem;
    transition: background-color 0.3s ease;
  }

  .react-calendar__navigation button:enabled:hover {
    background-color: rgba(0, 0, 0, 0.04);
  }

  .react-calendar__navigation button:disabled {
    color: rgba(0, 0, 0, 0.26);
  }

  /* Weekdays */
  .react-calendar__month-view__weekdays {
    text-align: center;
    font-weight: 500;
    color: rgba(0, 0, 0, 0.54);
    text-transform: uppercase;
    font-size: 0.75rem;
  }

  .react-calendar__month-view__weekdays__weekday {
    padding: 0.5em;
  }

  /* Tiles */
  .react-calendar__tile {
    max-width: 100%;
    padding: 10px;
    background: none;
    text-align: center;
    line-height: 16px;
    border-radius: 50%;
    transition: all 0.3s ease;
  }

  .react-calendar__tile:enabled:hover {
    background-color: rgba(0, 0, 0, 0.08);
  }

  .react-calendar__tile--now {
    background-color: rgba(0, 121, 107, 0.1);
    color: #00796B;
  }

  .react-calendar__tile--active {
    background-color: #1976D2 !important;
    color: white !important;
  }

  .react-calendar__tile--active:enabled:hover {
    background-color: #1565C0 !important;
  }

  .react-calendar__tile--weekend {
    color: #E53935;
  }

  /* Custom color classes */
  .on-board-day {
    background-color: rgba(244, 67, 54, 0.2) !important; /* Light Red */
    color: #f44336 !important;
  }

  .off-board-day {
    background-color: rgba(76, 175, 80, 0.2) !important; /* Light Green */
    color: #4CAF50 !important;
  }
`;

// Pure function to determine tile class
const getTileClassName = (date, view, workSchedule, workingRegime) => {
  // If no work schedule, return null
  if (!workSchedule?.nextOnBoardDate || !workSchedule?.nextOffBoardDate) {
    return null;
  }

  const onBoardStart = new Date(workSchedule.nextOnBoardDate);
  const onBoardEnd = new Date(workSchedule.nextOffBoardDate);
  const onDutyDays = workingRegime?.onDutyDays || 14;
  const offDutyDays = workingRegime?.offDutyDays || 14;
  const totalCycleDays = onDutyDays + offDutyDays;

  if (view !== 'month') return null;

  // Calculate the total cycle length
  const calculateDayClass = (checkDate) => {
    // Calculate days since the first on board date
    const daysSinceFirstOnBoard = Math.floor(
      (checkDate.getTime() - onBoardStart.getTime()) / (1000 * 3600 * 24)
    );

    // Use modulo to create a repeating cycle
    const cyclePosition = daysSinceFirstOnBoard % totalCycleDays;

    // Check if the date falls within on board or off board period
    if (cyclePosition < onDutyDays) {
      return 'on-board-day';
    } else {
      return 'off-board-day';
    }
  };

  // Check if the date is within 2 years from the first on board date
  const twoYearsFromStart = new Date(onBoardStart);
  twoYearsFromStart.setFullYear(twoYearsFromStart.getFullYear() + 2);

  // Only apply coloring if the date is within the 2-year range
  if (date >= onBoardStart && date <= twoYearsFromStart) {
    return calculateDayClass(date);
  }

  return null;
};

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [date, setDate] = useState(new Date());
  const [openOnBoardDialog, setOpenOnBoardDialog] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');
  const navigate = useNavigate();
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));

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

      // Check if user has set their On Board date
      if (!parsedUser.nextOnBoardDate) {
        setOpenOnBoardDialog(true);
      }
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

  const handleSetOnBoardDate = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Call backend API to set On Board date
      const response = await axios.put(
        'http://localhost:5000/api/auth/set-onboard-date', 
        { nextOnBoardDate: date },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Update local storage with new user data
      localStorage.setItem('user', JSON.stringify(response.data.user));
      
      // Update local state
      setUser(response.data.user);
      
      // Close dialog and show success message
      setOpenOnBoardDialog(false);
      setSnackbarMessage('On Board date set successfully!');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    } catch (error) {
      console.error('Error setting On Board date:', error);
      
      // Show error message
      setSnackbarMessage(
        error.response?.data?.message || 'Failed to set On Board date'
      );
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  const handleSnackbarClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbarOpen(false);
  };

  // Custom navigation label to hide year on small screens
  const navigationLabel = ({ date, label, locale }) => {
    // If small screen, remove the year
    const labelWithoutYear = isSmallScreen 
      ? label.replace(/\s\d{4}$/, '') 
      : label;

    return (
      <Typography variant="h6" sx={{ flexGrow: 1, textAlign: 'center' }}>
        {labelWithoutYear}
      </Typography>
    );
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
              {user.workSchedule?.nextOnBoardDate && (
                <Typography variant="body2" color="textSecondary">
                  Next On Board: {new Date(user.workSchedule.nextOnBoardDate).toLocaleDateString()}
                  <br />
                  Next Off Board: {new Date(user.workSchedule.nextOffBoardDate).toLocaleDateString()}
                </Typography>
              )}
            </Grid>
            
            <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'center' }}>
              <StyledCalendar
                onChange={onChange}
                value={date}
                showNeighboringMonth={false}
                navigationLabel={navigationLabel}
                prevLabel={<ChevronLeftIcon />}
                nextLabel={<ChevronRightIcon />}
                tileClassName={({ date, view }) => 
                  getTileClassName(date, view, user.workSchedule, user.workingRegime)
                }
              />
            </Grid>
          </Grid>
        </Paper>
      </Box>

      {/* On Board Date Selection Dialog */}
      <Dialog
        open={openOnBoardDialog}
        onClose={() => setOpenOnBoardDialog(false)}
        aria-labelledby="onboard-date-dialog-title"
        aria-describedby="onboard-date-dialog-description"
      >
        <DialogTitle id="onboard-date-dialog-title">
          Select Your Next On Board Date
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="onboard-date-dialog-description">
            To help calculate your offshore working schedule, please select the date of your next On Board period.
            This will help us determine your upcoming On and Off dates based on your working regime.
          </DialogContentText>
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <StyledCalendar
              onChange={setDate}
              value={date}
              showNeighboringMonth={false}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenOnBoardDialog(false)} color="primary">
            Cancel
          </Button>
          <Button onClick={handleSetOnBoardDate} color="primary" autoFocus>
            Set On Board Date
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for feedback */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleSnackbarClose} 
          severity={snackbarSeverity} 
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Dashboard;

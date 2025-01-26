import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { 
  Container, 
  Typography, 
  Box, 
  Paper, 
  Grid,
  Button,
  useMediaQuery,
  useTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Snackbar,
  Alert,
  TextField
} from '@mui/material';
import { 
  ChevronLeft as ChevronLeftIcon, 
  ChevronRight as ChevronRightIcon 
} from '@mui/icons-material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFnsV3';
import { styled } from '@mui/material/styles';

// Custom styled calendar to match Material-UI theme
const StyledCalendar = styled(FullCalendar)`
  width: 350px !important;
  max-width: 350px !important;
  background: white;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  font-family: 'Roboto', 'Helvetica', 'Arial', sans-serif;
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

// Function to generate calendar events based on work schedule
const generateCalendarEvents = (user) => {
  // Default empty array if no valid data
  const defaultEvents = [];

  // Always attempt to generate events, but return default if no valid data
  try {
    // Check if we have the minimum required data
    if (!user || !user.workSchedule || !user.workSchedule.nextOnBoardDate) {
      return defaultEvents;
    }

    const onBoardStart = new Date(user.workSchedule.nextOnBoardDate);
    const onDutyDays = user.workingRegime?.onDutyDays || 14;
    const offDutyDays = user.workingRegime?.offDutyDays || 14;

    const events = [];
    let currentDate = new Date(onBoardStart);

    // Generate events for the next 2 years
    for (let i = 0; i < 24; i++) {
      const cyclePosition = i % 2;
      
      const eventStart = new Date(currentDate);
      const eventEnd = new Date(currentDate);
      eventEnd.setDate(eventEnd.getDate() + (cyclePosition === 0 ? onDutyDays : offDutyDays));

      events.push({
        title: cyclePosition === 0 ? 'On Board' : 'Off Board',
        start: eventStart,
        end: eventEnd,
        allDay: true,
        className: cyclePosition === 0 ? 'on-board-event' : 'off-board-event'
      });

      currentDate = eventEnd;
    }

    return events;
  } catch (error) {
    console.error('Error generating calendar events:', error);
    return defaultEvents;
  }
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [date, setDate] = useState(new Date());
  const [openOnBoardDialog, setOpenOnBoardDialog] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));

  // Function to generate calendar events
  const generateCalendarEvents = () => {
    // Default empty array if no valid data
    const defaultEvents = [];

    // Always attempt to generate events, but return default if no valid data
    try {
      // Check if we have the minimum required data
      if (!user || !user.workSchedule || !user.workSchedule.nextOnBoardDate) {
        return defaultEvents;
      }

      const onBoardStart = new Date(user.workSchedule.nextOnBoardDate);
      const onDutyDays = user.workingRegime?.onDutyDays || 14;
      const offDutyDays = user.workingRegime?.offDutyDays || 14;

      const events = [];
      let currentDate = new Date(onBoardStart);

      // Generate events for the next 2 years
      for (let i = 0; i < 24; i++) {
        const cyclePosition = i % 2;
        
        // Only create events for On Board days
        if (cyclePosition === 0) {
          const eventStart = new Date(currentDate);
          const eventEnd = new Date(currentDate);
          eventEnd.setDate(eventEnd.getDate() + onDutyDays);

          events.push({
            title: 'On Board',
            start: eventStart,
            end: eventEnd,
            allDay: true,
            className: 'on-board-event'
          });
        }

        // Move to the next cycle
        currentDate.setDate(currentDate.getDate() + onDutyDays + offDutyDays);
      }

      return events;
    } catch (error) {
      console.error('Error generating calendar events:', error);
      return defaultEvents;
    }
  };

  // Calculate calendar events
  const calendarEvents = useMemo(() => generateCalendarEvents(user), [user]);

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

      // Automatically open On Board date dialog if no next On Board date is set
      if (!parsedUser.workSchedule?.nextOnBoardDate) {
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
            
            <Grid item xs={12}>
              <FullCalendar
                plugins={[dayGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                events={calendarEvents}
                height="auto"
                headerToolbar={{
                  left: 'prev,next today',
                  center: 'title',
                  right: ''
                }}
                eventContent={(eventInfo) => {
                  return {
                    html: `<div style="font-size: 0.8em; font-weight: bold;">${eventInfo.event.title}</div>`
                  };
                }}
                style={{
                  '--fc-border-color': '#e0e0e0',
                  '--fc-today-bg-color': 'rgba(0, 0, 0, 0.05)',
                  '--fc-list-event-hover-bg-color': 'rgba(0, 0, 0, 0.1)',
                }}
                eventDidMount={(info) => {
                  const eventEl = info.el;
                  if (info.event.classNames.includes('on-board-event')) {
                    eventEl.style.backgroundColor = 'rgba(244, 67, 54, 0.2)';
                    eventEl.style.color = '#f44336';
                  } else if (info.event.classNames.includes('off-board-event')) {
                    eventEl.style.backgroundColor = 'rgba(76, 175, 80, 0.2)';
                    eventEl.style.color = '#4CAF50';
                  }
                }}
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
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle id="onboard-date-dialog-title">
          Select Your Next On Board Date
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="onboard-date-dialog-description" sx={{ mb: 2 }}>
            To help calculate your offshore working schedule, please select the date of your next On Board period.
            This will help us determine your upcoming On and Off dates based on your working regime.
          </DialogContentText>
          
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DatePicker
              label="Next On Board Date"
              value={date}
              onChange={(newValue) => setDate(newValue)}
              renderInput={(params) => (
                <TextField 
                  {...params} 
                  fullWidth 
                  variant="outlined" 
                  sx={{ mt: 1 }}
                />
              )}
              minDate={new Date()}
              views={['year', 'month', 'day']}
            />
          </LocalizationProvider>
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

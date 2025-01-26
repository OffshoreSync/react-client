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
  TextField,
  Card,
  CardHeader,
  CardContent
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
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }

        const response = await axios.get('http://localhost:5000/api/auth/profile', {
          headers: { Authorization: `Bearer ${token}` }
        });

        // Ensure working regime is correctly stored
        const userWithFullData = {
          ...response.data.user,
          workingRegime: response.data.user.workingRegime || {
            onDutyDays: 28,  // Default to 28/28 if not present
            offDutyDays: 28
          }
        };

        // Validate working regime
        if (!userWithFullData.workingRegime || 
            typeof userWithFullData.workingRegime.onDutyDays !== 'number' ||
            typeof userWithFullData.workingRegime.offDutyDays !== 'number') {
          console.warn('Invalid working regime detected, using default');
          userWithFullData.workingRegime = {
            onDutyDays: 28,
            offDutyDays: 28
          };
        }

        // Update localStorage with fresh user data
        localStorage.setItem('user', JSON.stringify(userWithFullData));
        
        // Set user state
        setUser(userWithFullData);

        // Automatically open On Board date dialog if no next On Board date is set
        if (!userWithFullData.workSchedule?.nextOnBoardDate) {
          setOpenOnBoardDialog(true);
        }
      } catch (error) {
        console.error('Authentication error:', error);
        
        // Handle token expiration specifically
        if (error.response && error.response.data.error === 'TokenExpiredError') {
          // Clear existing token and user data
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          
          // Show a notification about token expiration
          setSnackbarMessage('Your session has expired. Please log in again.');
          setSnackbarSeverity('warning');
          setSnackbarOpen(true);
          
          // Redirect to login after a short delay
          setTimeout(() => {
            navigate('/login');
          }, 2000);
        } else {
          // For other authentication errors
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          navigate('/login');
        }
      }
    };

    checkAuth();
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
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card 
              elevation={4} 
              sx={{
                borderRadius: 2,
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                height: '100%'
              }}
            >
              <CardHeader
                title="Work Schedule"
                subheader="Your Offshore Work Calendar"
                titleTypographyProps={{
                  variant: 'h6',
                  color: 'primary',
                  fontWeight: 600
                }}
                subheaderTypographyProps={{
                  variant: 'body2',
                  color: 'text.secondary'
                }}
                sx={{
                  borderBottom: '1px solid rgba(0,0,0,0.12)',
                  paddingBottom: 2
                }}
              />
              <CardContent sx={{ flexGrow: 1, padding: 2 }}>
                <FullCalendar
                  themeSystem="standard"
                  plugins={[dayGridPlugin, interactionPlugin]}
                  initialView="dayGridMonth"
                  events={calendarEvents}
                  height="auto"
                  headerToolbar={{
                    left: 'prev,next today',
                    center: 'title',
                    right: ''
                  }}
                  buttonText={{
                    today: 'Today',
                    month: 'Month',
                    week: 'Week',
                    day: 'Day'
                  }}
                  customButtons={{
                    today: {
                      text: 'Today',
                      click: function(jsEvent, view) {
                        // Custom today button behavior if needed
                      }
                    }
                  }}
                  buttonIcons={{
                    prev: 'chevron-left',
                    next: 'chevron-right'
                  }}
                  eventContent={(eventInfo) => {
                    return {
                      html: `<div style="font-size: 0.8em; font-weight: 500; color: white; text-transform: uppercase; letter-spacing: 0.5px;">${eventInfo.event.title}</div>`
                    };
                  }}
                  dayHeaderFormat={{ 
                    weekday: 'short' 
                  }}
                  moreLinkContent={(arg) => {
                    return { 
                      html: `<div style="color: #1976D2; font-weight: 500;">+${arg.num} more</div>` 
                    };
                  }}
                  views={{
                    month: {
                      titleFormat: { year: 'numeric', month: 'long' }
                    }
                  }}
                  eventDidMount={(info) => {
                    const eventEl = info.el;
                    if (info.event.classNames.includes('on-board-event')) {
                      eventEl.style.backgroundColor = '#D32F2F';  // Material Dark Red
                      eventEl.style.color = 'white';
                      eventEl.style.borderLeft = '4px solid #B71C1C';  // Darker red for border
                      eventEl.style.borderRadius = '4px';
                      eventEl.style.textTransform = 'uppercase';
                      eventEl.style.letterSpacing = '0.5px';
                    }
                  }}
                  dayCellDidMount={(arg) => {
                    const date = arg.date;
                    const el = arg.el;
                    
                    // Check if the day is a weekend (0 = Sunday, 6 = Saturday)
                    if (date.getDay() === 0 || date.getDay() === 6) {
                      el.style.backgroundColor = 'rgba(211, 47, 47, 0.1)';  // Light red background
                      el.style.color = '#D32F2F';  // Material Dark Red text
                    }
                  }}
                  style={{
                    '--fc-border-color': 'rgba(0,0,0,0.12)',
                    '--fc-today-bg-color': 'rgba(25, 118, 210, 0.1)',
                    '--fc-list-event-hover-bg-color': 'rgba(0, 0, 0, 0.04)',
                    '--fc-neutral-bg-color': '#f5f5f5',
                    '--fc-page-bg-color': 'white',
                    fontFamily: "'Roboto', 'Helvetica', 'Arial', sans-serif",
                    borderRadius: '4px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}
                  viewDidMount={(arg) => {
                    const buttonEls = arg.view.calendar.el.querySelectorAll('.fc-button');
                    buttonEls.forEach(button => {
                      button.style.backgroundColor = '#1976D2';  // Material Blue
                      button.style.color = 'white';
                      button.style.border = 'none';
                      button.style.borderRadius = '4px';
                      button.style.textTransform = 'uppercase';
                      button.style.letterSpacing = '0.5px';
                      button.style.padding = '6px 12px';
                      button.style.margin = '0 4px';
                      button.style.transition = 'background-color 0.3s ease';
                      
                      button.addEventListener('mouseenter', () => {
                        button.style.backgroundColor = '#1565C0';  // Darker blue on hover
                      });
                      
                      button.addEventListener('mouseleave', () => {
                        button.style.backgroundColor = '#1976D2';
                      });
                    });
                  }}
                />
              </CardContent>
            </Card>
          </Grid>
        </Grid>
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

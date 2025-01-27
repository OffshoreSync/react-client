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

// Function to generate calendar events
const generateCalendarEvents = (user) => {
  // If no user or no next On Board date, return empty array
  if (!user || !user.workSchedule?.nextOnBoardDate) {
    return [];
  }

  // Fetch work cycles from the user's data
  const workCycles = user.workCycles || [];

  // Convert work cycles to calendar events
  const calendarEvents = [];

  workCycles.forEach((cycle, index) => {
    // Add the main cycle event
    calendarEvents.push({
      start: new Date(cycle.startDate),
      end: new Date(cycle.endDate),
      title: cycle.type,
      allDay: true,
      className: cycle.type === 'OnBoard' ? 'on-board-event' : 'off-board-event',
      extendedProps: {
        type: cycle.type.toLowerCase(),
        cycleNumber: cycle.cycleNumber
      }
    });

    // Special handling for the case where off-board start date is incremented
    if (index > 0) {
      const prevCycle = workCycles[index - 1];
      const currentCycle = cycle;

      // Check if the current cycle's start date is exactly one day after the previous cycle's end date
      const prevCycleEnd = new Date(prevCycle.endDate);
      const currentCycleStart = new Date(currentCycle.startDate);

      if (
        currentCycleStart.getTime() === new Date(prevCycleEnd.getTime() + 24 * 60 * 60 * 1000).getTime() &&
        prevCycle.type === 'OnBoard' &&
        currentCycle.type === 'OffBoard'
      ) {
        // Add an additional OnBoard event for this special day
        calendarEvents.push({
          start: prevCycleEnd,
          end: currentCycleStart,
          title: 'GET OFF',
          allDay: true,
          className: 'get-off-event',
          extendedProps: {
            type: 'get-off',
            cycleNumber: prevCycle.cycleNumber
          }
        });
      }

      // Special handling for the case where off-board end date is exactly the same as next on-board start date
      if (
        index < workCycles.length - 1 &&
        prevCycle.type === 'OffBoard' &&
        currentCycle.type === 'OnBoard'
      ) {
        const prevCycleEnd = new Date(prevCycle.endDate);
        const currentCycleStart = new Date(currentCycle.startDate);

        if (
          currentCycleStart.getTime() === new Date(prevCycleEnd.getTime() + 24 * 60 * 60 * 1000).getTime()
        ) {
          // Add an additional OnBoard event for this special day
          calendarEvents.push({
            start: prevCycleEnd,
            end: currentCycleStart,
            title: 'GET ON',
            allDay: true,
            className: 'get-on-event',
            extendedProps: {
              type: 'get-on',
              cycleNumber: currentCycle.cycleNumber
            }
          });
        }
      }
    }
  });

  return calendarEvents;
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

  // Calculate calendar events
  const calendarEvents = useMemo(() => generateCalendarEvents(user), [user]);

  useEffect(() => {
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

        // Check if work cycles exist, if not generate them
        if (!userWithFullData.workCycles || userWithFullData.workCycles.length === 0) {
          try {
            const cyclesResponse = await axios.post(
              'http://localhost:5000/api/auth/generate-work-cycles',
              {},
              {
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                }
              }
            );

            console.log('Generated Work Cycles:', cyclesResponse.data);

            // Update user with generated work cycles
            const updatedUser = {
              ...userWithFullData,
              workCycles: cyclesResponse.data.workCycles
            };

            // Update local storage and state
            localStorage.setItem('user', JSON.stringify(updatedUser));
            setUser(updatedUser);
          } catch (cyclesError) {
            console.error('Error generating work cycles:', cyclesError);
          }
        }

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
          
          // Redirect to login
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

      console.log('Set On Board Date Response:', response.data);

      // Generate work cycles
      const cyclesResponse = await axios.post(
        'http://localhost:5000/api/auth/generate-work-cycles',
        {},
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('Generate Work Cycles Response:', cyclesResponse.data);

      // Ensure the user object is complete
      const updatedUser = {
        ...response.data.user,
        workCycles: cyclesResponse.data.workCycles
      };

      // Update local storage with new user data including work cycles
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      // Update local state
      setUser(updatedUser);
      
      // Close dialog and show success message
      setOpenOnBoardDialog(false);
      setSnackbarMessage('On Board date set successfully!');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    } catch (error) {
      console.error('Error in handleSetOnBoardDate:', error);
      
      // More detailed error logging
      if (error.response) {
        console.error('Response Error Details:', {
          status: error.response.status,
          data: error.response.data,
          headers: error.response.headers
        });
      }
      
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

  // Responsive layout for smaller screens
  const responsiveStyles = {
    container: {
      padding: isSmallScreen ? theme.spacing(1) : theme.spacing(3),
      marginTop: isSmallScreen ? theme.spacing(1) : theme.spacing(3)
    },
    calendarHeader: {
      display: 'flex',
      flexDirection: isSmallScreen ? 'column' : 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: theme.spacing(2)
    },
    headerTitle: {
      fontSize: isSmallScreen ? '1rem' : '1.25rem',
      fontWeight: 600,
      textAlign: isSmallScreen ? 'center' : 'left',
      marginBottom: isSmallScreen ? theme.spacing(1) : 0
    },
    headerButtons: {
      display: 'flex',
      alignItems: 'center',
      gap: theme.spacing(1),
      flexWrap: 'wrap',
      justifyContent: isSmallScreen ? 'center' : 'flex-end'
    },
    calendarContainer: {
      width: '100%',
      overflowX: 'auto'
    }
  };

  return (
    <Container maxWidth="lg" sx={responsiveStyles.container}>
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
                  views={{
                    month: {
                      titleFormat: { 
                        year: 'numeric', 
                        month: isSmallScreen ? 'short' : 'long' 
                      }
                    }
                  }}
                  headerToolbar={{
                    left: 'prev',
                    center: 'title',
                    right: 'next'
                  }}
                  buttonText={{
                    prev: isSmallScreen ? '<' : 'PREVIOUS',
                    next: isSmallScreen ? '>' : 'NEXT'
                  }}
                  style={{
                    '--fc-border-color': 'rgba(0,0,0,0.12)',
                    '--fc-today-bg-color': 'rgba(25, 118, 210, 0.1)',
                    '--fc-list-event-hover-bg-color': 'rgba(0, 0, 0, 0.04)',
                    '--fc-neutral-bg-color': '#f5f5f5',
                    '--fc-page-bg-color': 'white',
                    fontFamily: "'Roboto', 'Helvetica', 'Arial', sans-serif",
                    borderRadius: '4px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    fontSize: isSmallScreen ? '0.75rem' : '1rem'
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
                    if (info.event.classNames.includes('off-board-event')) {
                      eventEl.style.backgroundColor = '#1976D2';  // Material Blue
                      eventEl.style.color = 'white';
                      eventEl.style.borderLeft = '4px solid #0D47A1';  // Darker blue for border
                      eventEl.style.borderRadius = '4px';
                      eventEl.style.textTransform = 'uppercase';
                      eventEl.style.letterSpacing = '0.5px';
                    }
                    if (info.event.classNames.includes('get-off-event')) {
                      eventEl.style.backgroundColor = '#34C759';  // Material Green
                      eventEl.style.color = 'white';
                      eventEl.style.borderLeft = '4px solid #2E865F';  // Darker green for border
                      eventEl.style.borderRadius = '4px';
                      eventEl.style.textTransform = 'uppercase';
                      eventEl.style.letterSpacing = '0.5px';
                    }
                    if (info.event.classNames.includes('get-on-event')) {
                      eventEl.style.backgroundColor = '#FF3B30';  // Material Red
                      eventEl.style.color = 'white';
                      eventEl.style.borderLeft = '4px solid #D9534F';  // Darker red for border
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
                  viewDidMount={(arg) => {
                    const buttonEls = arg.view.calendar.el.querySelectorAll('.fc-button');
                    const titleEl = arg.view.calendar.el.querySelector('.fc-toolbar-title');
                    
                    // Responsive button styling
                    buttonEls.forEach(button => {
                      button.style.backgroundColor = '#1976D2';  // Material Blue
                      button.style.color = 'white';
                      button.style.border = 'none';
                      button.style.borderRadius = '4px';
                      button.style.textTransform = 'uppercase';
                      button.style.letterSpacing = '0.5px';
                      button.style.padding = isSmallScreen ? '4px 8px' : '6px 12px';
                      button.style.margin = '0 4px';
                      button.style.fontSize = isSmallScreen ? '0.75rem' : '0.875rem';
                      button.style.transition = 'background-color 0.3s ease';
                      
                      button.addEventListener('mouseenter', () => {
                        button.style.backgroundColor = '#1565C0';  // Darker blue on hover
                      });
                      
                      button.addEventListener('mouseleave', () => {
                        button.style.backgroundColor = '#1976D2';
                      });
                    });

                    // Responsive title styling
                    if (titleEl) {
                      titleEl.style.fontSize = isSmallScreen ? '0.9rem' : '1.25rem';
                      titleEl.style.fontWeight = '600';
                      titleEl.style.textAlign = isSmallScreen ? 'center' : 'left';
                    }
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

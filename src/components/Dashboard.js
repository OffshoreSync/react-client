import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  CardContent,
  AlertTitle,
  IconButton,
  CircularProgress
} from '@mui/material';
import { 
  ChevronLeft as ChevronLeftIcon, 
  ChevronRight as ChevronRightIcon,
  Edit as EditIcon 
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';

// Import translation hook
import { useTranslation } from 'react-i18next';

// Import getBackendUrl
import { api, getCookie, setCookie, removeCookie } from '../utils/apiUtils';

// Import FullCalendar locales
import ptLocale from '@fullcalendar/core/locales/pt-br';
import enLocale from '@fullcalendar/core/locales/en-gb';
import esLocale from '@fullcalendar/core/locales/es';

// Import date-fns locales
import { enUS, ptBR, es } from 'date-fns/locale';

// Import MUI date picker components
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFnsV3';

// Custom styled calendar to match Material-UI theme
const StyledCalendar = styled(FullCalendar)`
  width: 350px !important;
  max-width: 350px !important;
  background: white;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  font-family: 'Roboto', 'Helvetica', 'Arial', sans-serif;
`;

// Function to get FullCalendar locale
const getFullCalendarLocale = (language) => {
  const localeMap = {
    'pt': ptLocale,
    'en': enLocale,
    'es': esLocale
  };
  return localeMap[language] || enLocale; // Default to English
};

// Mapping for date-fns locales
const getDateFnsLocale = (language) => {
  const localeMap = {
    'pt': ptBR,
    'en': enUS,
    'es': es
  };
  return localeMap[language] || enUS; // Default to English
};

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
const generateCalendarEvents = (user, t) => {
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
      title: cycle.type === 'OnBoard' 
        ? t('dashboard.offshoreTerms.onBoard') 
        : t('dashboard.offshoreTerms.offBoard'),
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
          title: t('dashboard.offshoreTerms.getOff'),
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
            title: t('dashboard.offshoreTerms.getOn'),
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
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [date, setDate] = useState(new Date());
  const [openOnBoardDialog, setOpenOnBoardDialog] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');
  const [showProfileAlert, setShowProfileAlert] = useState(false);
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const [calendarLocale, setCalendarLocale] = useState(
    getFullCalendarLocale(i18n.language)
  );
  const [datePickerLocale, setDatePickerLocale] = useState(
    getDateFnsLocale(i18n.language)
  );

  const updateUserInCookies = (updatedUser) => {
    setCookie('user', updatedUser);
  };

  // Memoize the checkAuth function to prevent unnecessary re-renders
  const checkAuth = useCallback(async () => {
    try {
      // Get token from cookie
      const token = getCookie('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Get stored user data
      const storedUser = getCookie('user');
      let userWithFullData;

      try {
        // Get fresh user data from API
        const response = await api.get('/api/auth/profile');
        userWithFullData = response.data.user;

        // Update stored user data
        setCookie('user', JSON.stringify(userWithFullData), {
          path: '/',
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax'
        });

        // Check both onboard dates and company/unit info
        const needsOnboardDate = !userWithFullData.workSchedule?.nextOnBoardDate && 
                               !userWithFullData.workingRegime?.nextOnBoardDate;
        const needsCompanyInfo = !userWithFullData.company || !userWithFullData.unitName;

        return {
          user: userWithFullData,
          showProfileAlert: needsCompanyInfo,
          needsOnboardDate: needsOnboardDate
        };
      } catch (error) {
        // If API call fails but we have stored user data, use that temporarily
        if (storedUser) {
          userWithFullData = JSON.parse(storedUser);
          // Check both onboard dates and company/unit info
          const needsOnboardDate = !userWithFullData.workSchedule?.nextOnBoardDate && 
                                 !userWithFullData.workingRegime?.nextOnBoardDate;
          const needsCompanyInfo = !userWithFullData.company || !userWithFullData.unitName;
          return {
            user: userWithFullData,
            showProfileAlert: needsCompanyInfo,
            needsOnboardDate: needsOnboardDate
          };
        }
        console.error('Profile fetch error:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status
        });
        throw error;
      }
    } catch (error) {
      console.error('Authentication check failed:', {
        message: error.message,
        type: error.name,
        stack: error.stack
      });
      throw error;
    }
  }, []); // No dependencies needed

useEffect(() => {
  const initializeDashboard = async () => {
    try {
      setLoading(true);
      const authResult = await checkAuth();
      if (authResult) {
        if (!authResult.user.workCycles?.length) {
          const cyclesResponse = await api.post('/auth/generate-work-cycles');
          const updatedUser = { ...authResult.user, workCycles: cyclesResponse.data.workCycles };
          updateUserInCookies(updatedUser);
          setUser(updatedUser);
        } else {
          setUser(authResult.user);
        }
        setShowProfileAlert(authResult.showProfileAlert);
        
        // Only show onboard dialog if we need onboard date AND it's not already set
        if (authResult.needsOnboardDate && !authResult.user.workSchedule?.nextOnBoardDate) {
          setOpenOnBoardDialog(true);
        }
      } else {
        throw new Error('Not authenticated');
      }
    } catch (error) {
      console.error('Dashboard initialization error:', error);
      setError(error.message);
      removeCookie('token');
      removeCookie('refreshToken');
      removeCookie('user');
      navigate('/login', { state: { message: 'Please log in to access your dashboard.' } });
    } finally {
      setLoading(false);
    }
  };
  initializeDashboard();
}, [checkAuth, navigate]);

  // Update locales when language changes
  useEffect(() => {
    // Set FullCalendar locale
    const newCalendarLocale = getFullCalendarLocale(i18n.language);
    setCalendarLocale(newCalendarLocale);

    // Set date-fns locale for DatePicker
    const newDateFnsLocale = getDateFnsLocale(i18n.language);
    setDatePickerLocale(newDateFnsLocale);
  }, [i18n.language]);

  // Calculate calendar events
  const calendarEvents = useMemo(() => generateCalendarEvents(user, t), [user, t]);

  // If loading, show a loading indicator
  if (loading) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        height="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  // If no user, return null
  if (!user) return null;

  const onChange = (newDate) => {
    setDate(newDate);
  };

  const handleSetOnBoardDate = async () => {
    try {
      // Call backend API to set On Board date
      const response = await api.put('/auth/set-onboard-date', { nextOnBoardDate: date });

      console.log('Set On Board Date Response:', response.data);

      // Generate work cycles
      const cyclesResponse = await api.post('/auth/generate-work-cycles');

      console.log('Generate Work Cycles Response:', cyclesResponse.data);

      // Ensure the user object is complete and update both workSchedule and workingRegime
      const updatedUser = {
        ...response.data.user,
        workCycles: cyclesResponse.data.workCycles,
        workSchedule: {
          ...response.data.user.workSchedule,
          nextOnBoardDate: date
        },
        workingRegime: {
          ...response.data.user.workingRegime,
          nextOnBoardDate: date
        }
      };

      // Update local storage with new user data including work cycles
      updateUserInCookies(updatedUser);
      
      // Update the user state to trigger re-render
      setUser(updatedUser);
      
      // Close dialog and check if we still need to show profile alert
      setOpenOnBoardDialog(false);
      const needsCompanyInfo = !updatedUser.company || !updatedUser.unitName;
      setShowProfileAlert(needsCompanyInfo);
      
      setSnackbarMessage(t('dashboard.snackbarMessages.onBoardDateSet'));
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
        error.response?.data?.message || t('dashboard.snackbarMessages.onBoardDateSetError')
      );
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  const handleResetOnBoardDate = async () => {
    try {
      const response = await api.put('/auth/reset-next-onboard-date');

      // Detailed logging for debugging
      console.log('Reset Onboard Date Response:', response.data);

      // Update user in localStorage with reset workSchedule
      const currentUser = user;
      
      // Safely update user object
      const updatedUser = {
        ...currentUser,
        workSchedule: {
          nextOnBoardDate: null,
          nextOffBoardDate: null
        }
      };

      // Update cookies and state
      updateUserInCookies(updatedUser);
      setUser(updatedUser);

      // Open the onboard date dialog
      setOpenOnBoardDialog(true);
    } catch (error) {
      // Comprehensive error logging
      console.error('Reset Onboard Date Error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        headers: error.response?.headers
      });

      // Specific error handling
      if (error.response) {
        switch (error.response.status) {
          case 401:
            setSnackbarMessage(t('dashboard.errors.unauthorized'));
            // Optional: Redirect to login
            navigate('/login');
            break;
          case 404:
            setSnackbarMessage(t('dashboard.errors.userNotFound'));
            break;
          default:
            setSnackbarMessage(
              error.response.data?.message || 
              t('dashboard.errors.resetOnBoardDateFailed')
            );
        }
      } else if (error.request) {
        // Request made but no response received
        setSnackbarMessage(t('dashboard.errors.noServerResponse'));
      } else {
        // Something happened in setting up the request
        setSnackbarMessage(t('dashboard.errors.requestSetupFailed'));
      }

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

  const handleCompleteProfile = () => {
    console.log('Navigating to settings');
    navigate('/settings');
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
    <Container maxWidth="lg">
      {/* Debug logging for alert state */}
      {console.log('Show Profile Alert:', showProfileAlert)}
      
      {showProfileAlert && (
        <Box sx={{ mb: 3 }}>
          <Alert 
            severity="warning" 
            action={
              <Button 
                color="inherit" 
                size="small" 
                onClick={handleCompleteProfile}
              >
                {t('dashboard.profileAlert.completeProfile')}
              </Button>
            }
          >
            <AlertTitle>{t('dashboard.profileAlert.title')}</AlertTitle>
            {t('dashboard.profileAlert.description')}
          </Alert>
        </Box>
      )}
      <Box sx={{ my: 4 }}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card 
              elevation={4} 
              sx={{
                borderRadius: 2,
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                height: '100%',
                position: 'relative'
              }}
            >
              <IconButton 
                onClick={handleResetOnBoardDate}
                sx={{ 
                  position: 'absolute', 
                  top: 10, 
                  right: 10,
                  color: 'primary.main'
                }}
                title={t('dashboard.resetOnBoardDate')}
              >
                <EditIcon />
              </IconButton>
              <CardHeader
                title={t('dashboard.workSchedule')}
                subheader={t('dashboard.workScheduleSubheader')}
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
                    prev: isSmallScreen ? '<' : t('dashboard.previous'),
                    next: isSmallScreen ? '>' : t('dashboard.next')
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
                  locale={calendarLocale}
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
          {t('dashboard.onBoardDateDialogTitle')}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="onboard-date-dialog-description" sx={{ mb: 2 }}>
            {t('dashboard.onBoardDateDialogDescription')}
          </DialogContentText>
          <LocalizationProvider 
            dateAdapter={AdapterDateFns} 
            adapterLocale={datePickerLocale}
          >
            <DatePicker
              label={t('dashboard.onBoardDate')}
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
            {t('dashboard.cancel')}
          </Button>
          <Button onClick={handleSetOnBoardDate} color="primary" autoFocus>
            {t('dashboard.setOnBoardDate')}
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

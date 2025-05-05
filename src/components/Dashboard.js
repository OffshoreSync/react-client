import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import './FullCalendarDarkTheme.css';
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
  Edit as EditIcon,
  AccessTime as AccessTimeIcon,
  DirectionsBoat as DirectionsBoatIcon,
  Home as HomeIcon
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';

// Import translation hook
import { useTranslation } from 'react-i18next';

// Import getBackendUrl
import { api, getCookie, setCookie, removeCookie, clearProfileCache } from '../utils/apiUtils';
import { useOfflineStatus } from '../hooks/useOfflineStatus';
import {
  clearCalendarCache,
  markOnboardDateChanged,
  wasOnboardDateChanged,
  clearOnboardDateChangedMarker
} from '../utils/workCyclesUtils';

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
  const isOffline = useOfflineStatus();
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
  const [daysCounter, setDaysCounter] = useState(null);
  const [counterType, setCounterType] = useState(null); // 'onBoard' or 'offBoard'
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

  // Calculate days remaining in current cycle
  const calculateDaysRemaining = (user) => {
    console.log('User object:', user);
    console.log('Work Cycles:', user?.workCycles);

    if (!user || !user.workCycles?.length) {
      console.log('No work cycles found');
      return null;
    }

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    console.log('Current date:', now);

    // Safely parse dates
    const safeParseDateString = (dateString) => {
      if (!dateString) return null;
      
      const parsedDate = new Date(dateString);
      parsedDate.setHours(0, 0, 0, 0);
      
      return !isNaN(parsedDate.getTime()) ? parsedDate : null;
    };

    // Prepare cycles with safely parsed dates
    const validCycles = user.workCycles.map(cycle => ({
      ...cycle,
      startDate: safeParseDateString(cycle.startDate),
      endDate: safeParseDateString(cycle.endDate)
    })).filter(cycle => cycle.startDate && cycle.endDate);

    console.log('Valid Cycles:', validCycles);

    // Find the closest cycle to current date
    const closestCycle = validCycles.reduce((closest, current) => {
      // Check if current cycle contains today
      if (now >= current.startDate && now <= current.endDate) {
        return current;
      }

      // If no cycle contains today, find the closest cycle
      if (!closest) return current;

      const currentDiff = Math.abs(current.startDate - now);
      const closestDiff = Math.abs(closest.startDate - now);

      return currentDiff < closestDiff ? current : closest;
    }, null);

    console.log('Closest Cycle:', closestCycle);

    // Determine status based on cycle type and current date
    if (closestCycle.type === 'OnBoard') {
      // For OnBoard cycle
      if (now >= closestCycle.startDate && now <= closestCycle.endDate) {
        // Currently waiting to start working
        const daysLeft = Math.max(0, Math.ceil((closestCycle.endDate - now) / (1000 * 60 * 60 * 24)));
        console.log('Days until work starts:', daysLeft);
        return { days: daysLeft, type: 'onBoard' };
      } else if (closestCycle.startDate > now) {
        // Waiting for cycle to start
        const daysLeft = Math.max(0, Math.ceil((closestCycle.startDate - now) / (1000 * 60 * 60 * 24)));
        console.log('Days until on board cycle starts:', daysLeft);
        return { days: daysLeft, type: 'onBoard' };
      }
    } else if (closestCycle.type === 'OffBoard') {
      // For OffBoard cycle
      if (now >= closestCycle.startDate && now <= closestCycle.endDate) {
        // Currently off board
        const daysLeft = Math.max(0, Math.ceil((closestCycle.endDate - now) / (1000 * 60 * 60 * 24)));
        console.log('Days left in off board cycle:', daysLeft);
        return { days: daysLeft, type: 'offBoard' };
      } else if (closestCycle.startDate > now) {
        // Waiting for off board cycle to start
        const daysLeft = Math.max(0, Math.ceil((closestCycle.startDate - now) / (1000 * 60 * 60 * 24)));
        console.log('Days until off board cycle starts:', daysLeft);
        return { days: daysLeft, type: 'onBoard' };
      }
    }

    // If no clear status, find next cycle
    const nextCycle = validCycles.find(cycle => cycle.startDate > closestCycle.endDate);
    
    if (nextCycle) {
      const daysLeft = Math.max(0, Math.ceil((nextCycle.startDate - now) / (1000 * 60 * 60 * 24)));
      console.log('Days until next cycle:', daysLeft);
      return { days: daysLeft, type: 'onBoard' };
    }

    return null;
  };

  useEffect(() => {
    if (user?.workCycles) {
      const remainingDays = calculateDaysRemaining(user);
      console.log('Updating days counter due to workCycles change:', remainingDays);
      if (remainingDays) {
        setDaysCounter(remainingDays.days);
        setCounterType(remainingDays.type);
      } else {
        setDaysCounter(null);
        setCounterType(null);
      }
    }
  }, [user?.workCycles]);

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
      
      // Check if onboard date was recently changed
      const dateChanged = wasOnboardDateChanged();
      if (dateChanged) {
        console.log('%c⚠️ Detected recent onboard date change - forcing fresh data', 'color: #FF9800; font-weight: bold');
        // Clear all calendar-related cache
        clearCalendarCache();
      }
      
      if (isOffline) {
        // Offline mode: try to fetch cached profile endpoint first
        try {
          const response = await api.get('/api/auth/profile');
          if (response.data && response.data.user) {
            setUser(response.data.user);
            setShowProfileAlert(false);
            const remainingDays = calculateDaysRemaining(response.data.user);
            if (remainingDays) {
              setDaysCounter(remainingDays.days);
              setCounterType(remainingDays.type);
            }
            return;
          }
        } catch (err) {
          // If fetch fails, fall back to cookie
          const cachedUser = getCookie('user');
          if (cachedUser) {
            setUser(cachedUser);
            setShowProfileAlert(false);
            const remainingDays = calculateDaysRemaining(cachedUser);
            if (remainingDays) {
              setDaysCounter(remainingDays.days);
              setCounterType(remainingDays.type);
            }
            return;
          }
          setError(t('dashboard.errors.authenticationFailed'));
          setSnackbarMessage(t('dashboard.errors.authenticationFailed'));
          setSnackbarSeverity('error');
          setSnackbarOpen(true);
          return;
        }
      } else {
        // Online mode: perform authentication check
        const authResult = await checkAuth();
        if (authResult) {
          // If onboard date was recently changed, force refresh profile to get latest work cycles
          if (dateChanged) {
            console.log('%c Fetching fresh profile data after onboard date change', 'color: #4CAF50; font-weight: bold');
            try {
              // Get fresh profile data from the server with cache busting
              const profileResponse = await api.get('/api/auth/profile', {
                params: { nocache: Date.now() }
              });
              
              if (profileResponse.data && profileResponse.data.user) {
                // Update the user object with fresh data
                const updatedUser = profileResponse.data.user;
                updateUserInCookies(updatedUser);
                setUser(updatedUser);
                
                // Calculate and set days counter with fresh data
                const remainingDays = calculateDaysRemaining(updatedUser);
                if (remainingDays) {
                  setDaysCounter(remainingDays.days);
                  setCounterType(remainingDays.type);
                }
                
                setShowProfileAlert(authResult.showProfileAlert);
                
                // Clear the onboard date changed marker since we've handled it
                clearOnboardDateChangedMarker();
                
                return;
              }
            } catch (profileError) {
              console.warn('Failed to refresh profile after onboard date change:', profileError);
              // Continue with normal flow if refresh fails
            }
          }
          // No need to generate work cycles separately, they should be included in the user profile
          // Just set the user from auth result
          setUser(authResult.user);
          
          setShowProfileAlert(authResult.showProfileAlert);
          // Calculate and set days counter
          const remainingDays = calculateDaysRemaining(authResult.user);
          if (remainingDays) {
            setDaysCounter(remainingDays.days);
            setCounterType(remainingDays.type);
          }
          
          // Only show onboard dialog if we need onboard date AND it's not already set
          if (authResult.needsOnboardDate && !authResult.user.workSchedule?.nextOnBoardDate) {
            setOpenOnBoardDialog(true);
          }
        } else {
          setError(t('dashboard.errors.authenticationFailed'));
          setSnackbarMessage(t('dashboard.errors.authenticationFailed'));
          setSnackbarSeverity('error');
          setSnackbarOpen(true);
        }
      }
    } catch (error) {
      console.error('Dashboard initialization error:', error);
      setError(error.message);
      setSnackbarMessage(error.message);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
  };
  initializeDashboard();
  // Only re-run when offline status changes or navigation changes
}, [isOffline, checkAuth, navigate]);

  // Update locales when language changes
  useEffect(() => {
    // Set FullCalendar locale
    const newCalendarLocale = getFullCalendarLocale(i18n.language);
    setCalendarLocale(newCalendarLocale);

    // Set date-fns locale for DatePicker
    const newDateFnsLocale = getDateFnsLocale(i18n.language);
    setDatePickerLocale(newDateFnsLocale);
  }, [i18n.language]);
  
  // Dark mode class is now handled by ThemeContext

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
      // Call backend API to set On Board date with past date support
      // The server will now generate work cycles as part of this endpoint
      const response = await api.put('/auth/set-onboard-date', { 
        nextOnBoardDate: date,
        allowPastDates: true  // New flag to allow past dates
      });

      console.log('Set On Board Date Response:', response.data);

      // Ensure the user object is complete and update workSchedule
      // Work cycles are now included in the response from set-onboard-date
      const updatedUser = {
        ...response.data.user,
        workSchedule: {
          ...response.data.user.workSchedule,
          nextOnBoardDate: date
        }
      };

      // Update local storage with new user data including work cycles
      updateUserInCookies(updatedUser);
      
      // Update the user state to trigger re-render
      setUser(updatedUser);
      
      // Clear calendar cache to ensure fresh data when navigating
      try {
        console.log('Clearing calendar cache after onboard date update');
        clearCalendarCache();
        
        // Store the updated work cycles in localStorage for immediate access
        if (response.data.user && response.data.user.workCycles) {
          try {
            localStorage.setItem('workCycles', JSON.stringify(response.data.user.workCycles));
            console.log('Stored fresh work cycles in localStorage');
          } catch (storageError) {
            console.warn('Failed to store work cycles in localStorage:', storageError);
          }
        }
        
        // Mark that the onboard date was changed - this will trigger a refresh on next load
        markOnboardDateChanged();
        console.log('Marked onboard date as changed for future page loads');
        
        // Clear profile cache to ensure fresh data on subsequent requests
        clearProfileCache();
      } catch (cacheError) {
        console.warn('Failed to clear calendar cache:', cacheError);
        // Continue with the flow even if cache clearing fails
      }
      
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
          headers: error.response.headers,
          requestData: { 
            nextOnBoardDate: date,
            allowPastDates: true
          }
        });
      } else if (error.request) {
        console.error('Request Error Details:', {
          request: error.request,
          message: error.message
        });
      } else {
        console.error('Unexpected Error:', error.message);
      }
    
      // Show error message
      setSnackbarMessage(
        error.response?.data?.message || 
        error.message || 
        t('dashboard.snackbarMessages.onBoardDateSetError')
      );
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  const handleResetOnBoardDate = async () => {
    try {
      const response = await api.put('/auth/reset-next-onboard-date');

      console.log('Reset Onboard Date Response:', response.data);

      // Update user in localStorage with reset workSchedule
      const currentUser = user;
      
      // Safely update user object with both workSchedule and workCycles
      const updatedUser = {
        ...currentUser,
        workSchedule: {
          nextOnBoardDate: null,
          nextOffBoardDate: null
        },
        // Ensure workCycles is updated from the response or set to empty array
        workCycles: response.data.workCycles || []
      };

      // Update cookies and state
      updateUserInCookies(updatedUser);
      setUser(updatedUser);
      
      // Clear calendar cache to ensure fresh data when navigating
      try {
        console.log('Clearing calendar cache after resetting onboard date');
        // Just clear the cache - no need for additional API calls
        // The work cycles were already updated by the server during the reset operation
        clearCalendarCache();
        
        // Store the updated work cycles in localStorage for immediate access
        if (response.data && response.data.workCycles) {
          try {
            localStorage.setItem('workCycles', JSON.stringify(response.data.workCycles));
            console.log('Stored fresh work cycles in localStorage');
          } catch (storageError) {
            console.warn('Failed to store work cycles in localStorage:', storageError);
          }
        } else {
          // If no workCycles in response, store empty array to ensure cache is consistent
          localStorage.setItem('workCycles', JSON.stringify([]));
          console.log('Stored empty work cycles array in localStorage');
        }
        
        // Mark that the onboard date was changed - this will trigger a refresh on next load
        markOnboardDateChanged();
        console.log('Marked onboard date as changed for future page loads');
      } catch (cacheError) {
        console.warn('Failed to clear calendar cache:', cacheError);
        // Continue with the flow even if cache clearing fails
      }

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
        {/* Days counter integrated into the calendar card */}

        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card 
              elevation={2} 
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
                subheader={
                  <Box>
                    {user?.workCycles?.length > 0 && daysCounter !== null ? (
                      <Typography 
                        variant="body2" 
                        sx={{
                          color: counterType === 'onBoard' 
                            ? (theme.palette.mode === 'dark' ? '#F170B1' : '#D32F2F')
                            : (theme.palette.mode === 'dark' ? '#70B7F1' : '#1976D2'),
                          fontWeight: 500,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.5
                        }}
                      >
                        {counterType === 'offBoard' ? (
                          <>
                            <DirectionsBoatIcon fontSize="small" />
                            {t('dashboard.daysUntilOnBoard', { days: daysCounter })}
                          </>
                        ) : (
                          <>
                            <HomeIcon fontSize="small" />
                            {t('dashboard.daysUntilOffBoard', { days: daysCounter })}
                          </>
                        )}
                      </Typography>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        {t('dashboard.workScheduleSubheader')}
                      </Typography>
                    )}
                  </Box>
                }
                titleTypographyProps={{
                  variant: 'h6',
                  color: 'primary',
                  fontWeight: 600
                }}
                sx={{
                  borderBottom: '1px solid rgba(0,0,0,0.12)',
                  paddingBottom: 2
                }}
              />
              <CardContent sx={{ flexGrow: 1, padding: 2 }}>
                <FullCalendar
                  key={`calendar-${theme.palette.mode}`} /* Force re-render on theme change */
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
                    '--fc-today-bg-color': 'rgba(25, 118, 210, 0.05)', // Lighter background since we'll have a circle
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
                    
                    // Check if today's date to add a circle around it
                    if (date.toDateString() === new Date().toDateString()) {
                      const todayCell = el.querySelector('.fc-daygrid-day-top');
                      if (todayCell) {
                        const dayNumber = todayCell.querySelector('a');
                        if (dayNumber) {
                          // Style the day number with a circle
                          dayNumber.style.backgroundColor = theme.palette.primary.main;
                          dayNumber.style.color = '#ffffff';
                          dayNumber.style.borderRadius = '50%';
                          dayNumber.style.width = '22px';
                          dayNumber.style.height = '22px';
                          dayNumber.style.display = 'flex';
                          dayNumber.style.justifyContent = 'center';
                          dayNumber.style.alignItems = 'center';
                          dayNumber.style.margin = '2px auto';
                          dayNumber.style.fontWeight = 'bold';
                        }
                      }
                    }
                    
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

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Container, 
  Box, 
  Select, 
  MenuItem, 
  FormControl, 
  InputLabel, 
  Button,
  useMediaQuery,
  useTheme,
  Snackbar,
  Alert,
  Chip,
  Card,
  CardContent,
  Modal,
  TextField,
  CircularProgress,
  Avatar,
  ListItemText,
  Typography
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import EventIcon from '@mui/icons-material/Event';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Brush
} from 'recharts';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import { useTranslation } from 'react-i18next';
import { api } from '../utils/apiUtils';
import { useAuth } from '../context/AuthContext';

// Utility function to format dates consistently
const formatDate = (date) => {
  return date instanceof Date 
    ? date.toISOString().split('T')[0] 
    : new Date(date).toISOString().split('T')[0];
};

// Mathematical graph approach to find matching Off Board periods
const findMatchingOffBoardPeriods = (userCycles) => {
  // Filter only Off Board cycles for each user
  const offBoardCyclesByUser = userCycles.map(cycles => 
    cycles.filter(cycle => cycle.type === 'OffBoard')
  );

  // Find the earliest and latest Off Board dates across all users
  const allOffBoardDates = offBoardCyclesByUser.flatMap(userCycles => 
    userCycles.flatMap(cycle => [new Date(cycle.startDate), new Date(cycle.endDate)])
  );
  
  const earliestDate = new Date(Math.min(...allOffBoardDates));
  const latestDate = new Date(Math.max(...allOffBoardDates));

  // Create a mapping function for each user's Off Board periods
  const createOffBoardMapping = (cycles, userName) => {
    const mapping = [];
    
    // Iterate through each day from earliest to latest date
    for (let currentDate = new Date(earliestDate); currentDate <= latestDate; currentDate.setDate(currentDate.getDate() + 1)) {
      // Check if any cycle covers this date
      const isOffBoard = cycles.some(cycle => {
        const startDate = new Date(cycle.startDate);
        const endDate = new Date(cycle.endDate);
        return currentDate >= startDate && currentDate <= endDate;
      });

      mapping.push({
        date: formatDate(currentDate),
        [userName]: isOffBoard ? 1 : 0
      });
    }

    return mapping;
  };

  // Create mappings for all users
  const userMappings = offBoardCyclesByUser.map((cycles, index) => 
    createOffBoardMapping(cycles, `User${index + 1}`)
  );

  // Merge mappings
  const mergedMapping = userMappings[0].map(baseItem => {
    const mergedItem = { ...baseItem };

    // Add data for each user
    userMappings.forEach((userMapping, index) => {
      const userItem = userMapping.find(u => u.date === baseItem.date);
      mergedItem[`User${index + 1}`] = userItem ? userItem[`User${index + 1}`] : 0;
    });

    // Calculate match (all users Off Board)
    mergedItem.Match = userMappings.every(userMapping => 
      userMapping.find(u => u.date === baseItem.date)?.[`User${userMappings.indexOf(userMapping) + 1}`] === 1
    ) ? 1 : 0;

    return mergedItem;
  });

  return mergedMapping;
};

// Generate a more Material Design color palette
const generateColorPalette = (numUsers) => {
  const materialColors = [
    '#1976D2',   // Material Blue
    '#D32F2F',   // Material Red
    '#388E3C',   // Material Green
    '#FFA000',   // Material Amber
    '#7B1FA2',   // Material Purple
    '#0288D1',   // Material Light Blue
    '#455A64',   // Material Blue Grey
    '#00796B'    // Material Teal
  ];
  return materialColors.slice(0, numUsers);
};

const Sync = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { user, loading } = useAuth();
  
  const [availableUsers, setAvailableUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [graphData, setGraphData] = useState([]);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');
  const [openProfileToast, setOpenProfileToast] = useState(false);
  const [isDateModalOpen, setIsDateModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [googleAccessToken, setGoogleAccessToken] = useState(null);
  const [eventDetails, setEventDetails] = useState({
    summary: '',
    description: ''
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login', { state: { reAuthRequired: true } });
      return;
    }

    if (user) {
      fetchAvailableUsers();
    }
  }, [user, loading, navigate]);

  const fetchAvailableUsers = async () => {
    try {
      const friendsResponse = await api.get('/api/auth/friends');
      
      // Get all friends, including those with sync disabled
      const allFriends = friendsResponse.data.friends.map(friend => ({
        ...friend,
        id: friend._id || friend.id,
        // Add sync status for display
        syncStatus: friend.sharingPreferences?.iCanSeeTheirSchedule && 
                   friend.sharingPreferences?.theyCanSeeMySchedule
                   ? 'enabled'
                   : 'disabled'
      }));

      const usersWithCurrentUser = [
        {
          ...user,
          id: user.id || user._id,
          fullName: `${user.fullName} (${t('sync.you')})`,
          isCurrentUser: true,
          syncStatus: 'enabled'
        },
        ...allFriends
      ];

      setAvailableUsers(usersWithCurrentUser);
    } catch (error) {
      console.error('Error in fetchAvailableUsers:', error);
      let errorMessage = t('sync.fetchError');
      
      if (error.response) {
        if (error.response.status === 401) {
          errorMessage = t('sync.unauthorizedError');
          navigate('/login');
        } else if (error.response.status === 403) {
          errorMessage = t('sync.forbiddenError');
        } else if (error.response.status >= 500) {
          errorMessage = t('sync.serverError');
        }
      } else if (error.request) {
        errorMessage = t('sync.connectionError');
      }

      setSnackbarMessage(errorMessage);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  // Reset selected users when available users change
  useEffect(() => {
    // Validate current selection against new available users
    const validSelectedUsers = selectedUsers.filter(id => 
      availableUsers.some(user => user.id === id && user.syncStatus === 'enabled')
    );
    
    if (validSelectedUsers.length !== selectedUsers.length) {
      console.log('Resetting invalid selections:', {
        old: selectedUsers,
        new: validSelectedUsers
      });
      setSelectedUsers(validSelectedUsers);
    }
  }, [availableUsers]);

  // Adjust line rendering for mobile
  const renderLines = useMemo(() => {
    const colors = generateColorPalette(selectedUsers.length);
    
    return [
      ...selectedUsers.map((userId, index) => {
        const userName = `User${index + 1}`;
        const user = availableUsers.find(u => u.id === userId);
        return (
          <Line 
            key={userId} 
            type="monotone" 
            dataKey={userName} 
            stroke={colors[index]} 
            activeDot={isMobile ? false : { r: 8 }} 
            dot={isMobile ? false : true}
            name={user ? user.fullName : userName}
          />
        );
      }),
      <Line
        key="match-line"
        type="monotone"
        dataKey="Match"
        stroke="#757575"  // Material Grey
        strokeWidth={3}
        activeDot={{ 
          r: 10, 
          fill: '#757575',
          stroke: 'white',
          strokeWidth: 2
        }}
      />
    ];
  }, [selectedUsers, isMobile, availableUsers]);

  // Function to extract common off-board dates
  const extractCommonOffBoardDates = useMemo(() => {
    if (!graphData || graphData.length === 0) return [];

    // Filter dates where Match is 1 (all users off board)
    const commonOffBoardDates = graphData
      .filter(item => item.Match === 1)
      .map(item => item.date);

    return commonOffBoardDates;
  }, [graphData]);

  // Function to close dates modal
  const handleCloseDateModal = () => {
    setIsDateModalOpen(false);
  };

  // Modal style
  const modalStyle = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: { xs: '90%', md: 400 },
    bgcolor: 'background.paper',
    boxShadow: 24,
    p: 4,
    borderRadius: 2,
  };

  // Google Calendar event creation
  const handleGoogleLogin = useGoogleLogin({
    flow: 'auth-code',
    scope: 'https://www.googleapis.com/auth/calendar.events',
    onSuccess: async (codeResponse) => {
      try {
        console.log('Google login success, exchanging code for token...');

        // Exchange authorization code for access token using our backend
        const tokenResponse = await api.post('/api/auth/google-token-exchange', {
          code: codeResponse.code
        });

        console.log('Token exchange success');
        setGoogleAccessToken(tokenResponse.data.access_token);
      } catch (error) {
        console.error('Google token exchange error:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status
        });
        
        let errorMessage = 'Failed to authenticate with Google';
        if (error.response?.data?.error) {
          errorMessage = error.response.data.error;
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        setSnackbarMessage(errorMessage);
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
      }
    },
    onError: (error) => {
      console.error('Google login error:', error);
      setSnackbarMessage('Google login failed: ' + error.message);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    },
    flow: 'auth-code',
    scope: 'https://www.googleapis.com/auth/calendar.events',
    redirect_uri: process.env.REACT_APP_FRONTEND_URL || window.location.origin
  });

  // Function to create Google Calendar event
  const createGoogleCalendarEvent = async (date) => {
    try {
      // Validate input
      if (!eventDetails.summary.trim()) {
        alert('Please provide an event summary');
        return;
      }

      if (!googleAccessToken) {
        alert('Please login with Google first');
        return;
      }

      const event = {
        summary: eventDetails.summary,
        description: eventDetails.description || 'Offshore Work Off Board Day',
        start: {
          date, // Full-day event
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        end: {
          date, // Same date for full-day event
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        }
      };

      const response = await api.post('/api/auth/google-calendar-event', {
        accessToken: googleAccessToken,
        event
      });

      // Show success snackbar
      setSnackbarOpen(true);
      setSnackbarMessage('Event created successfully!');
      setSnackbarSeverity('success');

      return response.data;
    } catch (error) {
      console.error('Error creating Google Calendar event:', error);
      
      // Detailed error handling
      let errorMessage = 'Failed to create event';
      
      if (error.response) {
        if (error.response.status === 401) {
          errorMessage = 'Unauthorized. Please re-authenticate with Google.';
          setGoogleAccessToken(null);
        } else if (error.response.status === 403) {
          errorMessage = 'Insufficient permissions to create event.';
        }
      }

      // Show error snackbar
      setSnackbarOpen(true);
      setSnackbarMessage(errorMessage);
      setSnackbarSeverity('error');
    }
  };

  // Handle user selection
  const handleUserChange = (event) => {
    const selectedIds = event.target.value;
    console.log('Selected IDs before validation:', selectedIds);
    
    // Ensure selectedIds is always an array
    const idsArray = Array.isArray(selectedIds) ? selectedIds : [];
    
    // Validate that all selected IDs exist in availableUsers
    const validIds = idsArray.filter(id => {
      if (!id) {
        console.error('Null or undefined ID found in selection');
        return false;
      }
      
      const userExists = availableUsers.some(user => user.id === id && user.syncStatus === 'enabled');
      if (!userExists) {
        console.error('Selected user ID not found in availableUsers:', id);
        console.log('Available Users:', availableUsers.map(u => ({ id: u.id, fullName: u.fullName })));
      }
      return userExists;
    });

    console.log('Valid IDs after validation:', validIds);
    setSelectedUsers(validIds);
  };

  // Find matching periods when users are selected
  const findMatches = async () => {
    if (selectedUsers.length < 2) {
      setSnackbarMessage('Please select at least two users');
      setSnackbarSeverity('warning');
      setSnackbarOpen(true);
      return;
    }

    try {
      console.log('Finding matches for users:', selectedUsers);
      console.log('Available users:', availableUsers.map(u => ({ id: u.id, fullName: u.fullName })));

      // Fetch work cycles for selected users
      const cyclesPromises = selectedUsers.map(async (userId) => {
        // Log the userId for debugging
        console.log('Fetching cycles for user:', {
          userId,
          userDetails: availableUsers.find(u => u.id === userId)
        });
        
        // Ensure userId is valid
        if (!userId) {
          console.error('Invalid userId:', userId);
          throw new Error('Invalid user ID');
        }

        const response = await api.get(`/api/auth/user-work-cycles/${userId}`);
        return response.data.workCycles;
      });

      // Wait for all cycles to be fetched
      const selectedCycles = await Promise.all(cyclesPromises);
      console.log('Fetched cycles:', selectedCycles);

      // Use the mathematical graph approach to find matches
      const mergedMapping = findMatchingOffBoardPeriods(selectedCycles);
      
      setGraphData(mergedMapping);
    } catch (error) {
      console.error('Error fetching work cycles:', error);
      
      let errorMessage = 'Failed to fetch work cycles';
      
      if (error.response) {
        if (error.response.status === 401) {
          errorMessage = 'Unauthorized. Please log in again.';
          navigate('/login');
        } else if (error.response.status === 403) {
          errorMessage = 'Access forbidden. You may not have permission.';
        } else if (error.response.status >= 500) {
          errorMessage = 'Server error. Please try again later.';
        }
      } else if (error.request) {
        errorMessage = 'No response from server. Please check your connection.';
      }

      setSnackbarMessage(errorMessage);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: { xs: 2, md: 4 } }}>
        <Card 
          elevation={2}
          sx={{ 
            mb: { xs: 2, md: 3 },
            borderRadius: 2,
            backgroundColor: 'background.paper'
          }}
        >
          <CardContent 
            sx={{ 
              textAlign: 'center',
              py: { xs: 2, md: 3 },
              px: { xs: 2, md: 4 }
            }}
          >
            <Typography variant="h4" gutterBottom sx={{ fontSize: { xs: '1.5rem', md: '2.125rem' } }}>
              {t('sync.title')}
            </Typography>
            <Typography 
              variant="subtitle1" 
              color="text.secondary" 
              sx={{ 
                fontSize: { xs: '0.875rem', md: '1rem' },
                maxWidth: 600,
                mx: 'auto'
              }}
            >
              {t('sync.subtitle')}
            </Typography>
          </CardContent>
        </Card>

        <FormControl 
          fullWidth 
          variant="outlined"
          sx={{ 
            mb: 2,
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
              '& .MuiSelect-select': {
                py: { xs: 1.5, md: 2 },
                px: { xs: 2, md: 3 },
                fontSize: { xs: '0.875rem', md: '1rem' },
                display: 'flex',
                alignItems: 'center',
                gap: 1.5
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: 'primary.main',
              },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: 'primary.main',
                borderWidth: 2,
              }
            },
            '& .MuiInputLabel-outlined': {
              transform: 'translate(14px, -9px) scale(0.75)',
              backgroundColor: 'transparent',
              px: 0.5,
              color: 'text.secondary',
              fontWeight: 400,
              fontSize: '1rem'
            }
          }}
        >
          <Select
            multiple
            value={selectedUsers || []}
            onChange={handleUserChange}
            renderValue={(selected) => (
              <Box sx={{ 
                display: 'flex', 
                flexWrap: 'wrap', 
                gap: 0.5,
                maxHeight: 100,
                overflowY: 'auto'
              }}>
                {(selected || []).map((id) => {
                  const user = availableUsers.find(user => user.id === id);
                  return user ? (
                    <Chip
                      key={id}
                      label={user.fullName}
                      size="small"
                      sx={{
                        backgroundColor: 'primary.light',
                        color: 'primary.contrastText',
                        '& .MuiChip-deleteIcon': {
                          color: 'primary.contrastText',
                          opacity: 0.7
                        }
                      }}
                      onDelete={() => {
                        const newSelected = selectedUsers.filter(userId => userId !== id);
                        console.log('Deleting user, new selection:', newSelected);
                        setSelectedUsers(newSelected);
                      }}
                    />
                  ) : null;
                })}
              </Box>
            )}
            MenuProps={{
              PaperProps: {
                sx: {
                  backgroundColor: 'background.paper',
                  maxHeight: 300
                }
              }
            }}
          >
            {availableUsers.map((user) => (
              <MenuItem
                key={user.id}
                value={user.id}
                disabled={user.syncStatus === 'disabled'}
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 1,
                  py: 1,
                  opacity: user.syncStatus === 'disabled' ? 0.5 : 1,
                  color: user.syncStatus === 'disabled' ? 'text.disabled' : 'text.primary',
                  '&.Mui-disabled': {
                    opacity: 0.5
                  }
                }}
              >
                {user.profilePicture ? (
                  <Avatar 
                    src={user.profilePicture} 
                    alt={user.fullName}
                    sx={{ width: 32, height: 32 }}
                  />
                ) : (
                  <AccountCircleIcon sx={{ width: 32, height: 32 }} />
                )}
                <ListItemText
                  primary={user.fullName}
                  secondary={user.syncStatus === 'disabled' ? t('sync.syncDisabled') : null}
                  primaryTypographyProps={{
                    component: 'div',
                    variant: 'body1'
                  }}
                  secondaryTypographyProps={{
                    component: 'div',
                    variant: 'caption',
                    sx: { 
                      fontSize: '0.75rem',
                      color: 'text.secondary'
                    }
                  }}
                />
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Button 
          variant="contained" 
          onClick={findMatches}
          disabled={selectedUsers.length < 2}
          sx={{
            width: '100%',
            py: { xs: 1, md: 1.5 },
            fontSize: { xs: '0.875rem', md: '1rem' }
          }}
        >
          {t('sync.findMatchingPeriods')}
        </Button>

        {selectedUsers.length > 1 && (
          <Box sx={{ mt: 2 }}>
            <Button
              variant="outlined"
              color="primary"
              onClick={() => {
                const dateString = extractCommonOffBoardDates.join(', ');
                navigator.clipboard.writeText(dateString).then(() => {
                  setSnackbarMessage(`Copied ${extractCommonOffBoardDates.length} common off-board dates`);
                  setSnackbarSeverity('success');
                  setSnackbarOpen(true);
                });
                
                // Open modal
                setIsDateModalOpen(true);
              }}
              disabled={extractCommonOffBoardDates.length === 0}
              startIcon={<EventIcon />}
            >
              {t('sync.exportCommonDates', { count: extractCommonOffBoardDates.length })}
            </Button>
          </Box>
        )}

        {graphData.length > 0 && (
          <Box sx={{ 
            width: '100%', 
            height: { xs: 400, md: 600 },  // Reduced height on mobile
            mt: { xs: 2, md: 4 },
            mb: { xs: 2, md: 4 },
            border: '1px solid rgba(0,0,0,0.12)',
            borderRadius: 2,
            padding: { xs: 1, md: 2 },
            backgroundColor: 'background.paper',
            overflow: 'hidden'
          }}>
            <ResponsiveContainer width="100%" height="90%">
              <LineChart
                data={graphData}
                margin={{ 
                  top: isMobile ? 10 : 20,    
                  right: isMobile ? 20 : 40,  
                  left: isMobile ? 20 : 40,   
                  bottom: isMobile ? 20 : 40  
                }}
              >
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke="rgba(0,0,0,0.1)"
                />
                <XAxis 
                  dataKey="date" 
                  angle={-45} 
                  textAnchor="end" 
                  interval={isMobile ? 'preserveStartEnd' : 0}  
                  height={isMobile ? 50 : 70}  
                  tick={{ 
                    fontSize: isMobile ? 8 : 10,
                    angle: isMobile ? -30 : -45
                  }}
                  allowDataOverflow={true}
                  domain={['dataMin', 'dataMax']}
                  scale="auto"
                />
                <YAxis 
                  domain={[0, 1]} 
                  ticks={[0, 1]} 
                  width={isMobile ? 30 : 40}  
                  tickFormatter={(value) => value === 1 ? 'Off' : 'On'}  
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid rgba(0,0,0,0.2)',
                    borderRadius: 8,
                    fontSize: isMobile ? '0.75rem' : '1rem'
                  }}
                  labelStyle={{ 
                    color: 'black', 
                    fontWeight: 'bold',
                    fontSize: isMobile ? '0.75rem' : '1rem'
                  }}
                  formatter={(value, name) => [
                    value === 1 ? 'Off Board' : 'On Board', 
                    name
                  ]}
                />
                <Legend 
                  verticalAlign="top" 
                  height={isMobile ? 60 : 75}  
                  iconSize={isMobile ? 15 : 20}
                  wrapperStyle={{ 
                    fontSize: isMobile ? '0.75rem' : '1rem'
                  }}
                />
                {renderLines}
                <Brush 
                  dataKey="date" 
                  height={isMobile ? 20 : 30} 
                  stroke="#757575"  // Material Grey
                  fill="rgba(117, 117, 117, 0.1)"  // Soft Material Grey background
                  startIndex={0}
                  endIndex={Math.min(isMobile ? 15 : 30, graphData.length - 1)}
                  travellerWidth={15}
                  sx={{
                    '& .recharts-brush-traveller': {
                      borderRadius: '50%',
                      boxShadow: theme.shadows[2],
                      border: `2px solid #757575`,
                      backgroundColor: theme.palette.background.paper,
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      '&:hover': {
                        boxShadow: theme.shadows[4],
                        transform: 'scale(1.1)'
                      }
                    },
                    '& .recharts-brush-slide': {
                      fill: '#BDBDBD',  // Material Grey Light
                      fillOpacity: 0.2
                    },
                    '& .recharts-brush-text': {
                      fill: theme.palette.text.secondary,
                      fontWeight: 500
                    }
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Box>
        )}
      </Box>

      {/* Modal for exported dates */}
      <Modal
        open={isDateModalOpen}
        onClose={handleCloseDateModal}
        aria-labelledby="common-dates-modal"
      >
        <Box sx={modalStyle}>
          <Typography id="common-dates-modal" variant="h6" component="h2" gutterBottom>
            {t('sync.commonOffBoardDates')}
          </Typography>
          
          {extractCommonOffBoardDates.length > 0 ? (
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: 2, 
              width: '100%' 
            }}>
              <FormControl fullWidth>
                <InputLabel id="common-dates-select-label">{t('sync.selectDate')}</InputLabel>
                <Select
                  labelId="common-dates-select-label"
                  id="common-dates-select"
                  value={selectedDate || ''}
                  label="Select Date"
                  onChange={(event) => {
                    setSelectedDate(event.target.value);
                  }}
                >
                  {extractCommonOffBoardDates
                    .sort((a, b) => new Date(a) - new Date(b))
                    .map((date) => (
                      <MenuItem key={date} value={date}>
                        {date}
                      </MenuItem>
                    ))
                  }
                </Select>
              </FormControl>
              
              {selectedDate && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                  {googleAccessToken ? (
                    <>
                      <TextField
                        fullWidth
                        label={t('sync.eventSummary')}
                        name="summary"
                        value={eventDetails.summary}
                        onChange={(e) => {
                          const { name, value } = e.target;
                          setEventDetails(prev => ({
                            ...prev,
                            [name]: value
                          }));
                        }}
                        required
                        placeholder={t('sync.enterEventSummary')}
                      />
                      <TextField
                        fullWidth
                        label={t('sync.eventDescription')}
                        name="description"
                        value={eventDetails.description}
                        onChange={(e) => {
                          const { name, value } = e.target;
                          setEventDetails(prev => ({
                            ...prev,
                            [name]: value
                          }));
                        }}
                        multiline
                        rows={3}
                        placeholder={t('sync.enterEventDescription')}
                      />
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={() => {
                          createGoogleCalendarEvent(selectedDate);
                          handleCloseDateModal();
                        }}
                        disabled={!eventDetails.summary.trim()}
                      >
                        {t('sync.createOffBoardDayEvent')}
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={handleGoogleLogin}
                    >
                      {t('sync.loginWithGoogleToCreateEvent')}
                    </Button>
                  )}
                </Box>
              )}
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">
              {t('sync.noCommonOffBoardDatesFound')}
            </Typography>
          )}
          
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
            <Button onClick={handleCloseDateModal}>{t('sync.close')}</Button>
          </Box>
        </Box>
      </Modal>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbarOpen(false)} 
          severity={snackbarSeverity}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
      <Snackbar
        open={openProfileToast}
        autoHideDuration={6000}
        onClose={() => setOpenProfileToast(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        message={t('sync.completeYourProfile')}
        action={
          <Button 
            color="secondary" 
            size="small" 
            onClick={() => {
              setOpenProfileToast(false);
              navigate('/settings');
            }}
          >
            {t('sync.updateProfile')}
          </Button>
        }
      />
    </Container>
  );
};

export default Sync;

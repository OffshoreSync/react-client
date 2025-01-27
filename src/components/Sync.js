import React, { useState, useMemo, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Select, 
  MenuItem, 
  FormControl, 
  InputLabel, 
  Button, 
  Grid,
  useMediaQuery,
  useTheme,
  Snackbar,
  Alert,
  Chip,
  Card,
  CardContent
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
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

// Custom Material Design tooltip
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <Card 
        elevation={4} 
        sx={{ 
          backgroundColor: 'rgba(255, 255, 255, 0.95)', 
          borderRadius: 2, 
          p: 2 
        }}
      >
        <CardContent>
          <Typography variant="h6" color="text.primary" gutterBottom>
            {label}
          </Typography>
          {payload.map((entry, index) => (
            <Box 
              key={`item-${index}`} 
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                mb: 1 
              }}
            >
              <Box 
                sx={{ 
                  width: 12, 
                  height: 12, 
                  borderRadius: '50%', 
                  backgroundColor: entry.color, 
                  mr: 1 
                }} 
              />
              <Typography variant="body2" color="text.secondary">
                {entry.name}: {entry.value === 1 ? 'Off Board' : 'On Board'}
              </Typography>
            </Box>
          ))}
        </CardContent>
      </Card>
    );
  }
  return null;
};

const Sync = () => {
  const [availableUsers, setAvailableUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [graphData, setGraphData] = useState([]);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('info');
  
  // Add media query for responsive design
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();

  // Fetch available users on component mount
  useEffect(() => {
    const fetchAvailableUsers = async () => {
      try {
        const token = localStorage.getItem('token');
        const currentUser = JSON.parse(localStorage.getItem('user'));
        
        if (!token || !currentUser) {
          navigate('/login');
          return;
        }

        const response = await axios.get('http://localhost:5000/api/auth/all-users', {
          headers: { Authorization: `Bearer ${token}` }
        });

        // Validate and filter users
        const validUsers = response.data.users.filter(user => 
          user.id && user.fullName && user.id !== currentUser.id
        );

        // Add current user with a special "You" label
        const usersWithCurrentUser = [
          {
            ...currentUser,
            fullName: `${currentUser.fullName} (You)`,
            isCurrentUser: true
          },
          ...validUsers
        ];

        setAvailableUsers(usersWithCurrentUser);
      } catch (error) {
        console.error('Error fetching available users:', error);
        
        // Detailed error handling
        let errorMessage = 'Failed to fetch available users';
        
        if (error.response) {
          if (error.response.status === 401) {
            errorMessage = 'Unauthorized. Please log in again.';
            localStorage.removeItem('token');
            localStorage.removeItem('user');
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

    fetchAvailableUsers();
  }, [navigate]);

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
        type="monotone"
        dataKey="Match"
        stroke="#E91E63"  // Material Pink
        strokeWidth={3}
        activeDot={{ 
          r: 10, 
          fill: '#E91E63',
          stroke: 'white',
          strokeWidth: 2
        }}
      />
    ];
  }, [selectedUsers, isMobile, availableUsers]);

  // Handle user selection
  const handleUserChange = (event) => {
    setSelectedUsers(event.target.value);
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
      const token = localStorage.getItem('token');
      
      // Fetch work cycles for selected users
      const cyclesPromises = selectedUsers.map(async (userId) => {
        const response = await axios.get(
          `http://localhost:5000/api/auth/user-work-cycles/${userId}`, 
          { headers: { Authorization: `Bearer ${token}` } }
        );
        return response.data.workCycles;
      });

      // Wait for all cycles to be fetched
      const selectedCycles = await Promise.all(cyclesPromises);

      // Use the mathematical graph approach to find matches
      const mergedMapping = findMatchingOffBoardPeriods(selectedCycles);
      
      setGraphData(mergedMapping);
    } catch (error) {
      console.error('Error fetching work cycles:', error);
      
      let errorMessage = 'Failed to fetch work cycles';
      
      if (error.response) {
        if (error.response.status === 401) {
          errorMessage = 'Unauthorized. Please log in again.';
          localStorage.removeItem('token');
          localStorage.removeItem('user');
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
              Off Board Periods Sync
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
              Visualize and compare Off Board periods across team members. Select multiple users to see when everyone is simultaneously off board.
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
            value={selectedUsers}
            onChange={handleUserChange}
            renderValue={(selected) => (
              <Box sx={{ 
                display: 'flex', 
                flexWrap: 'wrap', 
                gap: 0.5,
                maxHeight: 100,
                overflowY: 'auto'
              }}>
                {selected.map((id) => {
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
                        setSelectedUsers(selectedUsers.filter(userId => userId !== id));
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
                  borderRadius: 2,
                  maxHeight: 300,
                  width: 250,
                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                }
              },
              anchorOrigin: {
                vertical: 'bottom',
                horizontal: 'center'
              },
              transformOrigin: {
                vertical: 'top',
                horizontal: 'center'
              }
            }}
          >
            {availableUsers.map((user) => (
              <MenuItem 
                key={user.id} 
                value={user.id}
                sx={{ 
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  fontSize: { xs: '0.875rem', md: '1rem' },
                  '&:hover': {
                    backgroundColor: 'action.hover'
                  },
                  '&.Mui-selected': {
                    backgroundColor: 'transparent',
                    color: 'inherit',
                    '&:hover': {
                      backgroundColor: 'action.hover'
                    }
                  }
                }}
              >
                {user.isCurrentUser ? (
                  <PersonIcon sx={{ color: 'primary.main', mr: 1 }} />
                ) : (
                  <AccountCircleIcon sx={{ color: 'text.secondary', mr: 1 }} />
                )}
                {user.fullName}
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
          Find Matching Periods
        </Button>

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
            <Typography variant="h6" gutterBottom sx={{ 
              mb: 3, 
              fontSize: { xs: '1rem', md: '1.25rem' } 
            }}>
              Off Board Periods Graph
            </Typography>
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
                  width={isMobile ? 40 : 80}  
                  label={{ 
                    value: 'Off Board Status', 
                    angle: -90, 
                    position: 'insideLeft',
                    offset: isMobile ? 5 : 10,
                    fontSize: isMobile ? 10 : 12
                  }}
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
                  stroke="#8884d8"
                  startIndex={0}
                  endIndex={Math.min(isMobile ? 15 : 30, graphData.length - 1)}  
                />
              </LineChart>
            </ResponsiveContainer>
          </Box>
        )}
      </Box>

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
    </Container>
  );
};

export default Sync;

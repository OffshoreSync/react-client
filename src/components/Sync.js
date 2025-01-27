import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Container,
  Typography,
  Box,
  Grid,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Card,
  CardContent,
  Snackbar,
  Alert,
  useMediaQuery,
  useTheme
} from '@mui/material';
import { useNavigate } from 'react-router-dom';

const Sync = () => {
  const [availableUsers, setAvailableUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [userWorkCycles, setUserWorkCycles] = useState({});
  const [syncResults, setSyncResults] = useState([]);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('info');

  const navigate = useNavigate();
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));

  // Utility function to format dates consistently
  const formatDate = (date) => {
    if (!(date instanceof Date)) {
      date = new Date(date);
    }
    
    // Ensure valid date
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }

    // Format: YYYY-MM-DD
    return date.toISOString().split('T')[0];
  };

  // Utility function to safely convert dates and objects to strings
  const safeStringify = (value) => {
    if (value === null || value === undefined) return 'N/A';
    
    // If it's a Date object, convert to formatted string
    if (value instanceof Date) {
      return formatDate(value);
    }
    
    // If it's an object, try to get a meaningful string representation
    if (typeof value === 'object') {
      // Try to use a specific property or convert to JSON
      return value.startDate 
        ? formatDate(value.startDate) 
        : JSON.stringify(value);
    }
    
    // For other types, convert to string
    return String(value);
  };

  // Fetch available users
  useEffect(() => {
    const fetchAvailableUsers = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }

        const response = await axios.get('http://localhost:5000/api/auth/all-users', {
          headers: { Authorization: `Bearer ${token}` }
        });

        // Validate response data
        if (!response.data || !response.data.users || !Array.isArray(response.data.users)) {
          throw new Error('Invalid users data received');
        }

        // Filter out users without necessary information
        const validUsers = response.data.users.filter(user => 
          user.id && user.fullName && user.username
        );

        if (validUsers.length === 0) {
          setSnackbarMessage('No available users found');
          setSnackbarSeverity('warning');
          setSnackbarOpen(true);
        }

        setAvailableUsers(validUsers);
      } catch (error) {
        console.error('Error fetching available users:', error);
        
        // Detailed error handling
        let errorMessage = 'Failed to fetch available users';
        
        if (error.response) {
          // The request was made and the server responded with a status code
          // that falls out of the range of 2xx
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
          // The request was made but no response was received
          errorMessage = 'No response from server. Please check your connection.';
        }

        setSnackbarMessage(errorMessage);
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
      }
    };

    fetchAvailableUsers();
  }, [navigate]);

  // Fetch work cycles for selected users
  const fetchUserWorkCycles = async (usersToCompare) => {
    try {
      const token = localStorage.getItem('token');
      const cyclesPromises = usersToCompare.map(async (userId) => {
        try {
          const response = await axios.get(`http://localhost:5000/api/auth/user-work-cycles/${userId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });

          // Validate response data
          if (!response.data || !response.data.workCycles || !Array.isArray(response.data.workCycles)) {
            throw new Error(`Invalid work cycles data for user ${userId}`);
          }

          return { 
            userId, 
            workCycles: response.data.workCycles,
            fullName: response.data.fullName
          };
        } catch (userError) {
          console.error(`Error fetching work cycles for user ${userId}:`, userError);
          
          // Decide whether to throw or return a partial result
          return { 
            userId, 
            workCycles: [], 
            error: userError.response?.data?.message || 'Failed to fetch work cycles'
          };
        }
      });

      const userCyclesResults = await Promise.allSettled(cyclesPromises);
      
      // Filter out successful results and log any errors
      const successfulResults = userCyclesResults
        .filter(result => result.status === 'fulfilled')
        .map(result => result.value);

      // Check for any errors
      const erroredResults = userCyclesResults
        .filter(result => result.status === 'rejected')
        .map(result => result.reason);

      if (erroredResults.length > 0) {
        console.error('Errors fetching work cycles:', erroredResults);
        setSnackbarMessage(`Failed to fetch work cycles for ${erroredResults.length} users`);
        setSnackbarSeverity('warning');
        setSnackbarOpen(true);
      }

      // Convert to object for easier access
      const cyclesMap = successfulResults.reduce((acc, { userId, workCycles }) => {
        acc[userId] = workCycles;
        return acc;
      }, {});

      // If no valid work cycles found
      if (Object.keys(cyclesMap).length === 0) {
        setSnackbarMessage('No valid work cycles found for selected users');
        setSnackbarSeverity('warning');
        setSnackbarOpen(true);
        return;
      }

      setUserWorkCycles(cyclesMap);
      compareWorkCycles(cyclesMap);
    } catch (error) {
      console.error('Unexpected error in fetchUserWorkCycles:', error);
      setSnackbarMessage('An unexpected error occurred while fetching work cycles');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  // Find common Off Board periods across all selected users
  const findCommonOffBoardPeriods = (workCycles) => {
    // Get current user
    const currentUser = JSON.parse(localStorage.getItem('user'));

    // Convert work cycles to a more manageable format
    const userOffBoardPeriods = Object.keys(workCycles).map(userId => {
      // Filter and transform Off Board cycles
      const offBoardCycles = workCycles[userId]
        .filter(cycle => cycle.type === 'OffBoard')
        .map(cycle => ({
          userId,
          startDate: new Date(cycle.startDate),
          endDate: new Date(cycle.endDate)
        }));
      
      return {
        userId,
        name: userId === currentUser.id ? 'You' : 
          availableUsers.find(u => u.id === userId)?.fullName || userId,
        offBoardPeriods: offBoardCycles
      };
    });

    // Find common periods across all users
    const commonPeriods = [];

    // Check each Off Board period of the first user against others
    userOffBoardPeriods[0].offBoardPeriods.forEach(basePeriod => {
      // Check if this period overlaps with all other users' Off Board periods
      const isCommonPeriod = userOffBoardPeriods.slice(1).every(userPeriods => 
        userPeriods.offBoardPeriods.some(otherPeriod => 
          // Check for overlap
          basePeriod.startDate <= otherPeriod.endDate && 
          basePeriod.endDate >= otherPeriod.startDate
        )
      );

      if (isCommonPeriod) {
        // Calculate the actual overlap start and end
        const overlapStart = new Date(basePeriod.startDate);
        const overlapEnd = new Date(basePeriod.endDate);

        // Calculate overlap details for each user
        const userOverlaps = userOffBoardPeriods.map(userPeriods => {
          const userPeriod = userPeriods.offBoardPeriods.find(p => 
            p.startDate <= overlapEnd && p.endDate >= overlapStart
          );

          return {
            userId: userPeriods.userId,
            name: userPeriods.name,
            overlapStart: userPeriod ? new Date(Math.max(userPeriod.startDate, overlapStart)) : null,
            overlapEnd: userPeriod ? new Date(Math.min(userPeriod.endDate, overlapEnd)) : null
          };
        });

        commonPeriods.push({
          overlapStart: formatDate(overlapStart),
          overlapEnd: formatDate(overlapEnd),
          overlapDays: Math.ceil((overlapEnd - overlapStart) / (1000 * 60 * 60 * 24)) + 1,
          users: userOverlaps
        });
      }
    });

    return commonPeriods;
  };

  // Compare work cycles
  const compareWorkCycles = (workCycles) => {
    const userIds = Object.keys(workCycles);
    const syncMatches = [];

    // Find pairwise matches (existing logic)
    const getUserCombinations = (users) => {
      const combinations = [];
      for (let i = 0; i < users.length; i++) {
        for (let j = i + 1; j < users.length; j++) {
          combinations.push([users[i], users[j]]);
        }
      }
      return combinations;
    };

    // Pairwise matches
    const userCombinations = getUserCombinations(userIds);

    userCombinations.forEach(([user1Id, user2Id]) => {
      const user1Cycles = workCycles[user1Id];
      const user2Cycles = workCycles[user2Id];

      const matchingOffBoardPeriods = findMatchingOffBoardPeriods(user1Cycles, user2Cycles);

      if (matchingOffBoardPeriods.length > 0) {
        // Get current user
        const currentUser = JSON.parse(localStorage.getItem('user'));

        // Determine user names, marking current user as "You"
        const user1 = user1Id === currentUser.id 
          ? { id: user1Id, name: 'You' } 
          : availableUsers.find(u => u.id === user1Id) || { fullName: user1Id };
        
        const user2 = user2Id === currentUser.id 
          ? { id: user2Id, name: 'You' } 
          : availableUsers.find(u => u.id === user2Id) || { fullName: user2Id };

        syncMatches.push({
          type: 'pairwise',
          users: [
            { id: user1.id, name: user1.name || user1.fullName },
            { id: user2.id, name: user2.name || user2.fullName }
          ],
          matches: matchingOffBoardPeriods
        });
      }
    });

    // Find common periods across all users
    if (userIds.length > 1) {
      const commonPeriods = findCommonOffBoardPeriods(workCycles);
      
      if (commonPeriods.length > 0) {
        syncMatches.push({
          type: 'common',
          matches: commonPeriods
        });
      }
    }

    setSyncResults(syncMatches);
  };

  // Find matching Off Board periods with detailed analysis
  const findMatchingOffBoardPeriods = (cycles1, cycles2) => {
    const matches = [];

    cycles1.forEach(cycle1 => {
      if (cycle1.type !== 'OffBoard') return;

      cycles2.forEach(cycle2 => {
        if (cycle2.type !== 'OffBoard') return;

        // Parse dates
        const start1 = new Date(cycle1.startDate);
        const end1 = new Date(cycle1.endDate);
        const start2 = new Date(cycle2.startDate);
        const end2 = new Date(cycle2.endDate);

        // Calculate overlap
        const overlapStart = new Date(Math.max(start1, start2));
        const overlapEnd = new Date(Math.min(end1, end2));

        // Check for actual overlap
        if (overlapStart <= overlapEnd) {
          // Calculate overlap duration
          const overlapDays = Math.ceil((overlapEnd - overlapStart) / (1000 * 60 * 60 * 24)) + 1;

          matches.push({
            user1Cycle: {
              ...cycle1,
              startDate: formatDate(start1),
              endDate: formatDate(end1)
            },
            user2Cycle: {
              ...cycle2,
              startDate: formatDate(start2),
              endDate: formatDate(end2)
            },
            overlapStart: formatDate(overlapStart),
            overlapEnd: formatDate(overlapEnd),
            overlapDays: overlapDays,
            // Calculate percentage of overlap for each user's cycle
            user1OverlapPercentage: Math.round((overlapDays / ((end1 - start1) / (1000 * 60 * 60 * 24) + 1)) * 100),
            user2OverlapPercentage: Math.round((overlapDays / ((end2 - start2) / (1000 * 60 * 60 * 24) + 1)) * 100)
          });
        }
      });
    });

    return matches;
  };

  // Render sync results with detailed analysis
  const renderSyncResults = () => {
    // Ensure syncResults is always an array
    const safeSyncResults = syncResults || [];

    // If no matches found
    if (safeSyncResults.length === 0) {
      return (
        <Typography variant="body1" color="textSecondary" align="center">
          No matching Off Board periods found among selected users.
        </Typography>
      );
    }

    return (
      <Box>
        <Typography variant="h5" gutterBottom>
          Sync Opportunities
        </Typography>
        {safeSyncResults.map((result, index) => (
          <Card key={index} variant="outlined" sx={{ mb: 2 }}>
            <CardContent>
              {result.type === 'pairwise' ? (
                <>
                  <Typography variant="h6" color="primary" sx={{ mb: 2 }}>
                    Sync Match {index + 1}
                  </Typography>
                  <Typography variant="subtitle1" sx={{ mb: 2 }}>
                    Between {safeStringify(result.users[0].name)} and {safeStringify(result.users[1].name)}
                  </Typography>
                  {result.matches && result.matches.length > 0 ? (
                    result.matches.map((match, matchIndex) => (
                      <Box key={matchIndex} sx={{ mb: 2, p: 2, bgcolor: 'background.paper', borderRadius: 2 }}>
                        <Grid container spacing={2}>
                          <Grid item xs={12} sm={6}>
                            <Typography variant="body1">
                              <strong>{safeStringify(result.users[0].name)}'s Cycle:</strong>
                              <br />
                              {safeStringify(match.user1Cycle?.startDate)} - 
                              {safeStringify(match.user1Cycle?.endDate)}
                            </Typography>
                          </Grid>
                          
                          <Grid item xs={12} sm={6}>
                            <Typography variant="body1">
                              <strong>{safeStringify(result.users[1].name)}'s Cycle:</strong>
                              <br />
                              {safeStringify(match.user2Cycle?.startDate)} - 
                              {safeStringify(match.user2Cycle?.endDate)}
                            </Typography>
                          </Grid>
                          
                          <Grid item xs={12}>
                            <Typography variant="body1">
                              <strong>Overlap Period:</strong>
                              {safeStringify(match.overlapStart)} - 
                              {safeStringify(match.overlapEnd)}
                            </Typography>
                          </Grid>
                          
                          <Grid item xs={12} sm={6}>
                            <Typography variant="body2">
                              <strong>Overlap Duration:</strong> {safeStringify(match.overlapDays)} days
                            </Typography>
                          </Grid>
                          
                          <Grid item xs={12} sm={6}>
                            <Typography variant="body2">
                              <strong>Overlap Percentage:</strong>
                              <br />
                              {safeStringify(result.users[0].name)}: {safeStringify(match.user1OverlapPercentage)}%
                              <br />
                              {safeStringify(result.users[1].name)}: {safeStringify(match.user2OverlapPercentage)}%
                            </Typography>
                          </Grid>
                        </Grid>
                      </Box>
                    ))
                  ) : (
                    <Typography variant="body2" color="textSecondary">
                      No matching periods found for this pair.
                    </Typography>
                  )}
                </>
              ) : (
                <>
                  <Typography variant="h6" color="primary" sx={{ mb: 2 }}>
                    Common Off Board Period
                  </Typography>
                  {result.matches && result.matches.length > 0 ? (
                    result.matches.map((match, matchIndex) => (
                      <Box key={matchIndex} sx={{ mb: 2, p: 2, bgcolor: 'background.paper', borderRadius: 2 }}>
                        <Grid container spacing={2}>
                          <Grid item xs={12}>
                            <Typography variant="body1">
                              <strong>Common Overlap Period:</strong>
                              {safeStringify(match.overlapStart)} - 
                              {safeStringify(match.overlapEnd)}
                            </Typography>
                          </Grid>
                          
                          <Grid item xs={12} sm={6}>
                            <Typography variant="body2">
                              <strong>Overlap Duration:</strong> {safeStringify(match.overlapDays)} days
                            </Typography>
                          </Grid>
                          
                          <Grid item xs={12}>
                            <Typography variant="body2">
                              <strong>Users in this Period:</strong>
                            </Typography>
                            {match.users ? (
                              match.users.map((user, userIndex) => (
                                <Typography key={userIndex} variant="body2">
                                  {safeStringify(user.name)}: {safeStringify(user.overlapStart)} - {safeStringify(user.overlapEnd)}
                                </Typography>
                              ))
                            ) : (
                              <Typography variant="body2" color="textSecondary">
                                No user information available
                              </Typography>
                            )}
                          </Grid>
                        </Grid>
                      </Box>
                    ))
                  ) : (
                    <Typography variant="body2" color="textSecondary">
                      No common periods found.
                    </Typography>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </Box>
    );
  };

  // Handle user selection
  const handleUserSelect = (event) => {
    const selectedUserIds = event.target.value;
    setSelectedUsers(selectedUserIds);
  };

  // Handle sync button click
  const handleSync = () => {
    // Get the current logged-in user
    const currentUser = JSON.parse(localStorage.getItem('user'));

    if (!currentUser) {
      setSnackbarMessage('Please log in to use Sync');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      return;
    }

    // Ensure at least 1 additional user is selected
    if (selectedUsers.length === 0) {
      setSnackbarMessage('Please select at least 1 user to compare');
      setSnackbarSeverity('warning');
      setSnackbarOpen(true);
      return;
    }

    // Automatically include the current user in comparison
    const usersToCompare = [currentUser.id, ...selectedUsers];

    // Update selectedUsers to include current user
    setSelectedUsers(usersToCompare);

    fetchUserWorkCycles(usersToCompare);
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>
        Sync Off Board Periods
      </Typography>

      <Grid container spacing={2}>
        <Grid item xs={12}>
          <FormControl fullWidth>
            <InputLabel>Select Users</InputLabel>
            <Select
              multiple
              value={selectedUsers}
              label="Select Users"
              onChange={handleUserSelect}
            >
              {availableUsers.map((user) => (
                <MenuItem key={user.id} value={user.id}>
                  {user.fullName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12}>
          <Button 
            variant="contained" 
            color="primary" 
            fullWidth 
            onClick={handleSync}
          >
            Find Sync Opportunities
          </Button>
        </Grid>

        <Grid item xs={12}>
          {syncResults.length > 0 ? (
            renderSyncResults()
          ) : (
            <Typography variant="body2" color="textSecondary" align="center">
              {selectedUsers.length > 0 
                ? 'No matching Off Board periods found' 
                : 'Select at least 1 user to find sync opportunities'}
            </Typography>
          )}
        </Grid>
      </Grid>

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

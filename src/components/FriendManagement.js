import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Container, 
  Typography, 
  Box, 
  List, 
  ListItem, 
  ListItemAvatar, 
  Avatar, 
  ListItemText, 
  Button, 
  TextField, 
  Paper,
  Divider,
  IconButton,
  Tooltip,
  Chip,
  Grid,
  Card,
  CardContent,
  CardActions,
  Snackbar,
  Alert
} from '@mui/material';
import { 
  PersonAdd as PersonAddIcon, 
  Check as CheckIcon, 
  Close as CloseIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { api } from '../utils/apiUtils';

const FriendManagement = () => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [friends, setFriends] = useState([]);
  const [error, setError] = useState('');

  // Toast state
  const [toast, setToast] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  useEffect(() => {
    fetchPendingRequests();
    fetchFriends();
  }, []);

  const handleToastClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setToast({ ...toast, open: false });
  };

  const fetchPendingRequests = async () => {
    try {
      const response = await api.get('/api/auth/friend-requests');
      setPendingRequests(response.data.pendingRequests);
    } catch (error) {
      console.error('Error fetching pending requests:', error);
      setToast({
        open: true,
        message: t('friendManagement.fetchRequestsError'),
        severity: 'error'
      });
    }
  };

  const fetchFriends = async () => {
    try {
      const response = await api.get('/api/auth/friends');
      setFriends(response.data.friends);
    } catch (error) {
      console.error('Error fetching friends:', error);
      setToast({
        open: true,
        message: t('friendManagement.fetchFriendsError'),
        severity: 'error'
      });
    }
  };

  const searchUsers = async () => {
    try {
      const response = await api.get('/api/auth/search-users', {
        params: { query: searchQuery }
      });
      setSearchResults(response.data.users);
      setError('');
    } catch (error) {
      setError(error.response?.data?.message || t('friendManagement.searchError'));
      setSearchResults([]);
      setToast({
        open: true,
        message: error.response?.data?.message || t('friendManagement.searchError'),
        severity: 'error'
      });
    }
  };

  const sendFriendRequest = async (targetUserId) => {
    try {
      await api.post('/api/auth/friend-request', { friendId: targetUserId });
      
      // Update search results to reflect sent request
      setSearchResults(prev => 
        prev.map(user => 
          user.id === targetUserId 
            ? { ...user, friendshipStatus: 'PENDING' } 
            : user
        )
      );
      
      // Show success toast
      setToast({
        open: true,
        message: t('friendManagement.requestSent'),
        severity: 'success'
      });
    } catch (error) {
      // Use the error message from the backend, fallback to translation
      const errorMessage = error.response?.data?.message || t('friendManagement.requestError');
      setError(errorMessage);
      
      // Show error toast
      setToast({
        open: true,
        message: errorMessage,
        severity: 'error'
      });
    }
  };

  const handleFriendRequestResponse = async (requestId, status) => {
    try {
      await api.put(`/api/auth/friend-request/${requestId}`, { status });
      fetchPendingRequests();
      fetchFriends();

      // Show success toast based on status
      setToast({
        open: true,
        message: status === 'ACCEPTED' 
          ? t('friendManagement.requestAccepted') 
          : t('friendManagement.requestDeclined'),
        severity: 'success'
      });
    } catch (error) {
      console.error('Error responding to friend request:', error);
      setToast({
        open: true,
        message: t('friendManagement.requestResponseError'),
        severity: 'error'
      });
    }
  };

  return (
    <Container maxWidth="lg">
      {/* Snackbar for Toast Notifications */}
      <Snackbar
        open={toast.open}
        autoHideDuration={6000}
        onClose={handleToastClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleToastClose} 
          severity={toast.severity} 
          sx={{ width: '100%' }}
        >
          {toast.message}
        </Alert>
      </Snackbar>

      <Paper elevation={3} sx={{ p: 3, mt: 3 }}>
        <Typography variant="h5" gutterBottom>
          {t('friendManagement.title')}
        </Typography>

        {/* User Search */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <TextField
            fullWidth
            label={t('friendManagement.searchPlaceholder')}
            variant="outlined"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            error={!!error}
            helperText={error}
          />
          <Button
            variant="contained"
            color="primary"
            startIcon={<SearchIcon />}
            onClick={searchUsers}
            disabled={searchQuery.length < 2}
          >
            {t('friendManagement.search')}
          </Button>
        </Box>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {searchResults.map((user) => (
              <Grid item xs={12} md={4} key={user.id}>
                <Card variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar 
                        src={user.profilePicture} 
                        alt={user.fullName}
                        sx={{ width: 56, height: 56 }}
                      />
                      <Box>
                        <Typography variant="h6">{user.fullName}</Typography>
                        <Typography variant="body2" color="textSecondary">
                          {user.email}
                        </Typography>
                        {user.company && (
                          <Typography variant="body2" color="textSecondary">
                            {user.company}
                            {user.unitName && ` - ${user.unitName}`}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </CardContent>
                  <CardActions>
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={<PersonAddIcon />}
                      onClick={() => sendFriendRequest(user.id)}
                      disabled={
                        user.friendshipStatus === 'PENDING' || 
                        user.friendshipStatus === 'ACCEPTED'
                      }
                    >
                      {user.friendshipStatus === 'PENDING' 
                        ? t('friendManagement.requestPending')
                        : user.friendshipStatus === 'ACCEPTED'
                          ? t('friendManagement.alreadyFriends')
                          : t('friendManagement.sendRequest')
                      }
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {/* Pending Friend Requests */}
        <Typography variant="h6" sx={{ mt: 3 }}>
          {t('friendManagement.pendingRequests')}
        </Typography>
        <List>
          {pendingRequests.length === 0 ? (
            <Typography variant="body2" color="textSecondary" sx={{ textAlign: 'center', mt: 2 }}>
              {t('friendManagement.noPendingRequests')}
            </Typography>
          ) : (
            pendingRequests.map((request) => (
              <React.Fragment key={request.id}>
                <ListItem
                  secondaryAction={
                    <>
                      <Tooltip title={t('friendManagement.accept')}>
                        <IconButton 
                          edge="end" 
                          color="primary"
                          onClick={() => handleFriendRequestResponse(request.id, 'ACCEPTED')}
                        >
                          <CheckIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={t('friendManagement.decline')}>
                        <IconButton 
                          edge="end" 
                          color="secondary"
                          onClick={() => handleFriendRequestResponse(request.id, 'BLOCKED')}
                        >
                          <CloseIcon />
                        </IconButton>
                      </Tooltip>
                    </>
                  }
                >
                  <ListItemAvatar>
                    <Avatar 
                      src={request.user.profilePicture} 
                      alt={request.user.fullName}
                    />
                  </ListItemAvatar>
                  <ListItemText
                    primary={request.user.fullName}
                    secondary={request.user.email}
                  />
                </ListItem>
                <Divider variant="inset" component="li" />
              </React.Fragment>
            ))
          )}
        </List>

        {/* Friends List */}
        <Typography variant="h6" sx={{ mt: 3 }}>
          {t('friendManagement.friendsList')}
        </Typography>
        <List>
          {friends.length === 0 ? (
            <Typography variant="body2" color="textSecondary" sx={{ textAlign: 'center', mt: 2 }}>
              {t('friendManagement.noFriends')}
            </Typography>
          ) : (
            friends.map((friend) => (
              <React.Fragment key={friend.id}>
                <ListItem>
                  <ListItemAvatar>
                    <Avatar 
                      src={friend.profilePicture} 
                      alt={friend.fullName}
                    />
                  </ListItemAvatar>
                  <Box sx={{ flexGrow: 1 }}>
                    <ListItemText
                      primary={
                        <Typography variant="subtitle1" component="div">
                          {friend.fullName}
                        </Typography>
                      }
                      secondary={
                        <React.Fragment>
                          <Typography variant="body2" color="textSecondary" component="div">
                            {friend.email}
                          </Typography>
                          {friend.company && (
                            <Typography variant="body2" color="textSecondary" component="div">
                              {friend.company}
                              {friend.unitName && ` - ${friend.unitName}`}
                            </Typography>
                          )}
                        </React.Fragment>
                      }
                    />
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Tooltip 
                      title={
                        friend.sharingPreferences.allowScheduleSync 
                          ? t('friendManagement.syncEnabled') 
                          : t('friendManagement.syncDisabled')
                      }
                    >
                      <Chip 
                        label={
                          friend.sharingPreferences.allowScheduleSync 
                            ? t('friendManagement.syncOn') 
                            : t('friendManagement.syncOff')
                        }
                        color={
                          friend.sharingPreferences.allowScheduleSync 
                            ? 'primary' 
                            : 'default'
                        }
                        size="small"
                      />
                    </Tooltip>
                  </Box>
                </ListItem>
                <Divider variant="inset" component="li" />
              </React.Fragment>
            ))
          )}
        </List>
      </Paper>
    </Container>
  );
};

export default FriendManagement;

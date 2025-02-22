import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import { 
  Container, 
  Typography, 
  TextField, 
  Button, 
  Box, 
  Paper, 
  Link as MuiLink,
  Alert,
  IconButton,
  InputAdornment
} from '@mui/material';
import { 
  Login as LoginIcon, 
  Visibility, 
  VisibilityOff 
} from '@mui/icons-material';
import { GoogleLogin } from '@react-oauth/google';

// Import translation hook
import { useTranslation } from 'react-i18next';
import getBackendUrl from '../utils/apiUtils';
import { styled } from '@mui/material/styles';
import { useCookies } from 'react-cookie';

// Styling for Google Sign-In button container
const GoogleSignInContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  width: '100%',
  marginTop: theme.spacing(2),
  marginBottom: theme.spacing(3)
}));

// Styling for the entire form section with extra spacing
const FormSection = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(2),
  marginBottom: theme.spacing(3)
}));

// Enhanced input validation functions
const validateUsername = (username) => {
  // Allow only alphanumeric characters and underscores
  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
  return usernameRegex.test(username);
};

const validatePassword = (password) => {
  // Require:
  // - Minimum 8 characters
  // - At least one uppercase letter
  // - At least one lowercase letter
  // - At least one number
  // - At least one special character
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
};

const Login = () => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockExpiry, setLockExpiry] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [reAuthMessage, setReAuthMessage] = useState('');
  const [cookies, setCookie, removeCookie] = useCookies(['token', 'user', 'loginLockExpiry']);

  const navigate = useNavigate();
  const location = useLocation();

  const { username, password } = formData;

  // Add client-side rate limiting
  useEffect(() => {
    const checkLoginLock = () => {
      const lockExpiryTime = cookies.loginLockExpiry ? parseInt(cookies.loginLockExpiry, 10) : 0;
      const currentTime = Date.now();

      if (lockExpiryTime > currentTime) {
        const remainingTime = Math.ceil((lockExpiryTime - currentTime) / 1000);
        setIsLocked(true);
        setLockExpiry(lockExpiryTime);
        return true;
      }
      
      removeCookie('loginLockExpiry', { path: '/' });
      setIsLocked(false);
      return false;
    };

    checkLoginLock();
    const intervalId = setInterval(checkLoginLock, 60000); // Check every minute
    return () => clearInterval(intervalId);
  }, [cookies, removeCookie, setIsLocked, setLockExpiry]);

  useEffect(() => {
    if (location.state?.successMessage) {
      setSuccessMessage(location.state.successMessage);
      
      // Clear the state to prevent message from persisting
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  useEffect(() => {
    // Check if navigation state contains re-authentication message
    const locationState = location.state;
    
    if (locationState?.requireReAuthentication) {
      setReAuthMessage(
        locationState.message || 'Your session has expired. Please log in again.'
      );

      // Clear the location state to prevent repeated messages
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const onChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError(''); // Clear error when user starts typing
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Check if account is locked
    if (isLocked) {
      const remainingTime = Math.ceil((lockExpiry - Date.now()) / 60000);
      setError(t('login.errors.accountLocked', { minutes: remainingTime }));
      return;
    }

    // Validate inputs
    if (!validateUsername(username)) {
      setError(t('login.errors.invalidUsername'));
      return;
    }

    if (!validatePassword(password)) {
      setError(t('login.errors.invalidPassword'));
      return;
    }

    try {
      const response = await axios.post(
        getBackendUrl('/api/auth/login'), 
        {
          username,
          password
        },
        {
          // Add CSRF protection if using cookies
          withCredentials: true,
          // Add additional headers for security
          headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'Content-Type': 'application/json'
          }
        }
      );

      // Check for verification requirement
      if (response.data.requiresVerification) {
        setError(t('login.errors.emailNotVerified', { 
          email: response.data.email 
        }));
        return;
      }

      // Reset login attempts on successful login
      setLoginAttempts(0);
      removeCookie('loginLockExpiry', { path: '/' });

      // Store token and user in cookies with enhanced options
      console.log('Login Token Details:', {
        tokenLength: response.data.token ? response.data.token.length : 'N/A',
        tokenFirstChars: response.data.token ? response.data.token.substring(0, 10) : 'N/A',
        userDataPresent: !!response.data.user,
        userKeys: response.data.user ? Object.keys(response.data.user) : []
      });

      setCookie('token', response.data.token, { 
        path: '/', 
        secure: true,  // Only send over HTTPS
        sameSite: 'strict',  // Protect against CSRF
        maxAge: 30 * 24 * 60 * 60 // 30 days expiration
      });
      
      setCookie('user', response.data.user, { 
        path: '/', 
        secure: true,
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 // 30 days expiration
      });

      // Verify cookies after setting
      console.log('Cookies after login:', {
        tokenCookie: cookies.token,
        userCookie: cookies.user
      });

      // Clear password from memory
      setFormData(prev => ({ ...prev, password: '' }));

      navigate('/dashboard');
    } catch (err) {
      if (err.response?.data?.requiresVerification) {
        setError(t('login.errors.emailNotVerified', { 
          email: err.response.data.email 
        }));
      } else {
        // Increment login attempts
        const newAttempts = loginAttempts + 1;
        setLoginAttempts(newAttempts);

        // Lock account after 5 failed attempts
        if (newAttempts >= 5) {
          const lockExpiryTime = Date.now() + (15 * 60 * 1000); // 15 minutes
          setIsLocked(true);
          setLockExpiry(lockExpiryTime);
          setCookie('loginLockExpiry', lockExpiryTime.toString(), { 
            path: '/', 
            maxAge: Math.floor(15 * 60) 
          });
          setError(t('login.errors.tooManyAttempts'));
          return;
        }

        console.error('Login error:', err.response?.data || err.message);
        setError(t('login.errors.loginFailed'));
      }
    }
  };

  const handleGoogleLogin = async (credentialResponse) => {
    try {
      // Comprehensive logging of credential response
      console.log('Google Credential Response:', {
        credentialPresent: !!credentialResponse.credential,
        clientId: process.env.REACT_APP_GOOGLE_CLIENT_ID
      });

      // Validate credential response
      if (!credentialResponse.credential) {
        throw new Error('Google credential is missing');
      }

      // Send Google token to backend with enhanced configuration
      const response = await axios.post(
        getBackendUrl('/api/auth/google-login'), 
        {
          googleToken: credentialResponse.credential
        },
        {
          // Ensure credentials are sent with the request
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Credentials': 'true'
          },
          // Add timeout to prevent hanging
          timeout: 10000
        }
      );

      // Log the entire response for debugging
      console.log('Google Login Backend Response:', {
        status: response.status,
        data: JSON.stringify(response.data, null, 2)
      });

      // Store token and user in cookies with enhanced options
      console.log('Google Login Token Details:', {
        tokenLength: response.data.token ? response.data.token.length : 'N/A',
        tokenFirstChars: response.data.token ? response.data.token.substring(0, 10) : 'N/A',
        userDataPresent: !!response.data.user,
        userKeys: response.data.user ? Object.keys(response.data.user) : []
      });

      setCookie('token', response.data.token, { 
        path: '/', 
        secure: true,  // Only send over HTTPS
        sameSite: 'strict',  // Protect against CSRF
        maxAge: 30 * 24 * 60 * 60 // 30 days expiration
      });
      
      setCookie('user', response.data.user, { 
        path: '/', 
        secure: true,
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 // 30 days expiration
      });

      // Verify cookies after setting
      console.log('Cookies after Google login:', {
        tokenCookie: cookies.token,
        userCookie: cookies.user
      });

      // Dispatch event to update profile picture
      window.dispatchEvent(new Event('profilePictureUpdated'));

      // Redirect to dashboard
      navigate('/dashboard');
    } catch (err) {
      // Comprehensive error handling
      console.error('Google Login Error:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        headers: err.response?.headers
      });

      // Set user-friendly error message
      setError(t('login.errors.googleLoginFailed'));
    }
  };

  return (
    <Container maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Typography component="h1" variant="h5">
          {t('login.title')}
        </Typography>
        <Paper 
          elevation={3} 
          sx={{ 
            width: '100%', 
            padding: 3, 
            marginTop: 2,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          {successMessage && (
            <Alert severity="success" sx={{ width: '100%', mt: 2 }}>
              {successMessage}
            </Alert>
          )}
          {reAuthMessage && (
            <Alert severity="error" sx={{ width: '100%', mt: 2 }}>
              {reAuthMessage}
            </Alert>
          )}
          <Box component="form" onSubmit={onSubmit} noValidate sx={{ mt: 1 }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="username"
              label={t('login.username')}
              name="username"
              autoComplete="username"
              autoFocus
              value={username}
              onChange={onChange}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label={t('login.password')}
              type={showPassword ? 'text' : 'password'}
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={onChange}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            
            <Typography variant="body2" align="right" sx={{ mt: 1 }}>
              <MuiLink 
                component={Link} 
                to="/forgot-password" 
                sx={{ 
                  textDecoration: 'none', 
                  color: 'primary.main',
                  '&:hover': {
                    textDecoration: 'underline'
                  }
                }}
              >
                {t('login.forgotPassword')}
              </MuiLink>
            </Typography>
            
            {error && (
              <Alert severity="error" sx={{ width: '100%', mt: 2 }}>
                {error}
              </Alert>
            )}
            
            <Button
              type="submit"
              fullWidth
              variant="contained"
              startIcon={<LoginIcon />}
              sx={{ mt: 3, mb: 2 }}
            >
              {t('common.login')}
            </Button>
            
            <GoogleSignInContainer>
              <GoogleLogin
                onSuccess={handleGoogleLogin}
                onError={() => {
                  console.log('Login Failed');
                  setError(t('login.errors.googleLoginFailed'));
                }}
                theme="white"
                size="large"
                text="signin_with"
                shape="rectangular"
              />
            </GoogleSignInContainer>

            <FormSection>
              <Typography variant="body2" color="text.secondary" align="center">
                {t('login.noAccount')}{' '}
                <MuiLink 
                  component={Link} 
                  to="/register" 
                  sx={{ ml: 1 }}
                >
                  {t('common.register')}
                </MuiLink>
              </Typography>
            </FormSection>
            <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 2 }}>
              <MuiLink 
                component={Link} 
                to="/" 
                sx={{ 
                  textDecoration: 'none', 
                  color: 'text.secondary',
                  '&:hover': {
                    textDecoration: 'underline'
                  }
                }}
              >
                Continue to Home Page
              </MuiLink>
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default Login;

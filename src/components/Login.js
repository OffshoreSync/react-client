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
import { api, setCookie, getCookie, removeCookie } from '../utils/apiUtils';
import { styled } from '@mui/material/styles';

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

  const navigate = useNavigate();
  const location = useLocation();

  const { username, password } = formData;

  // Add client-side rate limiting
  useEffect(() => {
    const checkLoginLock = () => {
      const lockExpiryTime = getCookie('loginLockExpiry');
      const currentTime = Date.now();

      if (lockExpiryTime && parseInt(lockExpiryTime, 10) > currentTime) {
        const remainingTime = Math.ceil((parseInt(lockExpiryTime, 10) - currentTime) / 1000);
        if (!isLocked) { 
          setIsLocked(true);
          setLockExpiry(parseInt(lockExpiryTime, 10));
        }
        return true;
      }
      
      if (isLocked) { 
        removeCookie('loginLockExpiry');
        setIsLocked(false);
      }
      return false;
    };

    checkLoginLock();
  }, [isLocked]);

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
      const response = await api.post('/api/auth/login', {
        username,
        password
      });

      if (response.data.user) {
        setCookie('user', response.data.user);
        
        // Reset login attempts
        setLoginAttempts(0);
        removeCookie('loginLockExpiry');
        
        // Redirect to the intended page or dashboard
        const { from } = location.state || { from: { pathname: '/dashboard' } };
        navigate(from);
      }
    } catch (error) {
      console.error('Login error:', error);
      
      // Increment login attempts
      const newAttempts = loginAttempts + 1;
      setLoginAttempts(newAttempts);
      
      // Lock account after 5 failed attempts
      if (newAttempts >= 5) {
        const lockExpiryTime = Date.now() + (15 * 60 * 1000); // 15 minutes
        setCookie('loginLockExpiry', lockExpiryTime);
        setIsLocked(true);
        setLockExpiry(lockExpiryTime);
        setError(t('login.errors.accountLocked', { minutes: 15 }));
      } else {
        setError(t('login.errors.invalidCredentials'));
      }
    }
  };

  const handleGoogleLogin = async (credentialResponse) => {
    try {
      if (!credentialResponse.credential) {
        throw new Error('Google credential is missing');
      }

      const response = await api.post('/api/auth/google-login', {
        googleToken: credentialResponse.credential
      });

      if (response.data.user) {
        setCookie('user', response.data.user);
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Google login error:', error);
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

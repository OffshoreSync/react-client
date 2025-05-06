import React, { useState, useCallback, useContext, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { 
  Container, 
  Box, 
  Typography, 
  TextField, 
  Button, 
  Paper,
  Alert,
  IconButton,
  InputAdornment,
  Link as MuiLink
} from '@mui/material';
import { 
  LoginOutlined as LoginIcon,
  Visibility, 
  VisibilityOff 
} from '@mui/icons-material';
import { GoogleLogin, useGoogleLogin } from '@react-oauth/google';
import { useTheme } from '../context/ThemeContext';
import { styled } from '@mui/material/styles';
import { api, getCookie, getValidToken } from '../utils/apiUtils';
import { useAuth } from '../context/AuthContext';

// Import translation hook
import { useTranslation } from 'react-i18next';

// Styling for Google Sign-In button container
const GoogleSignInContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  width: '100%',
  marginTop: theme.spacing(2),
  marginBottom: theme.spacing(2)
}));

// Styling for the entire form section
const FormSection = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(2),
  width: '100%'
}));

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { setUser, login, user } = useAuth();
  const { mode } = useTheme(); // Get current theme mode
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState(location.state?.successMessage || '');
  const [showVerificationAlert] = useState(location.state?.showVerificationAlert || false);
  const [reAuthMessage] = useState(location.state?.reAuthRequired ? t('login.reAuthRequired') : '');
  const [checkingAuth, setCheckingAuth] = useState(true);
  
  // Check for valid tokens on component mount
  useEffect(() => {
    const checkExistingAuth = async () => {
      try {
        setCheckingAuth(true);
        // Check if we have a valid token (regular or PWA)
        const token = await getValidToken();
        const userCookie = getCookie('user');
        
        if (token && userCookie) {
          console.log('%c🔄 Valid token found, redirecting to dashboard', 'color: #4CAF50; font-weight: bold');
          navigate('/dashboard');
          return;
        }
      } catch (error) {
        console.error('Error checking authentication:', error);
      } finally {
        setCheckingAuth(false);
      }
    };
    
    checkExistingAuth();
  }, [navigate]);
  
  const { username, password } = formData;

  const onChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError(''); // Clear error when user types
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const response = await api.post('/auth/login', formData);
      
      // Debug login response
      console.debug('Login Component - Response:', {
        hasToken: !!response.data.token,
        hasRefreshToken: !!response.data.refreshToken,
        hasUser: !!response.data.user
      });

      // Verify that we got both tokens and user data
      if (!response.data.token || !response.data.refreshToken || !response.data.user) {
        throw new Error('Invalid server response - missing token, refresh token or user data');
      }

      // Use the AuthContext login method instead of directly setting cookies
      await login(response.data.token, response.data.refreshToken, response.data.user);

      setTimeout(() => {
        navigate('/dashboard');
      }, 100);
    } catch (error) {
      console.error('Login error:', error);
      setError(error.response?.data?.message || t('login.errors.loginFailed'));
    }
  };

  // Enhanced Google login handler with Calendar scope
  const handleGoogleLogin = useGoogleLogin({
    flow: 'auth-code',
    scope: 'email profile https://www.googleapis.com/auth/calendar.events',
    onSuccess: async (codeResponse) => {
      try {
        console.debug('Google login success, exchanging code for token...');
        
        // Exchange authorization code for access token and login using our backend
        const loginResponse = await api.post('/api/auth/google-login-with-calendar', {
          code: codeResponse.code
        });

        console.debug('Login response:', loginResponse.data);

        if (!loginResponse.data.token || !loginResponse.data.refreshToken) {
          throw new Error('Invalid server response - missing tokens');
        }

        // Use the AuthContext login method instead of directly setting cookies
        await login(loginResponse.data.token, loginResponse.data.refreshToken, loginResponse.data.user);

        // Navigate to dashboard
        navigate('/dashboard');
      } catch (error) {
        console.error('Google login error:', error);
        setError(t('login.errors.googleLoginFailed'));
      }
    },
    onError: (error) => {
      console.error('Google login error:', error);
      setError(t('login.errors.googleLoginFailed'));
    }
  });

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper
          elevation={2}
          sx={{
            p: 4,
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            borderRadius: 2,
            bgcolor: 'background.paper'
          }}
        >
          <Typography 
            component="h1" 
            variant="h5" 
            sx={{ 
              mb: 3,
              fontWeight: 600,
              color: 'primary.main'
            }}
          >
            {t('login.title')}
          </Typography>

          {successMessage && showVerificationAlert && (
            <Alert severity="success" sx={{ width: '100%', mb: 2 }}>
              {successMessage}
            </Alert>
          )}

          {reAuthMessage && (
            <Alert severity="info" sx={{ width: '100%', mb: 2 }}>
              {reAuthMessage}
            </Alert>
          )}

          {error && (
            <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={onSubmit} style={{ width: '100%' }}>
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
            
            <Button
              type="submit"
              fullWidth
              variant="contained"
              startIcon={<LoginIcon />}
              sx={{ mt: 3, mb: 2 }}
            >
              {t('common.login')}
            </Button>

            <Typography variant="body2" align="center" color="text.secondary" sx={{ my: 2 }}>
            {t('login.or')}
            </Typography>

            <GoogleSignInContainer>
              <Button
                onClick={handleGoogleLogin}
                variant="outlined"
                fullWidth
                startIcon={
                  <svg width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                    <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
                    <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" />
                    <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" />
                    <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z" />
                  </svg>
                }
                sx={{
                  backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'white',
                  color: mode === 'dark' ? 'white' : 'rgba(0,0,0,0.87)',
                  borderColor: mode === 'dark' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.23)',
                  '&:hover': {
                    backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.04)',
                    borderColor: mode === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.23)'
                  },
                  textTransform: 'none',
                  fontSize: '0.9rem',
                  py: 1
                }}
              >
                {t('login.signInWithGoogle')}
              </Button>
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
          </form>
        </Paper>
      </Box>
    </Container>
  );
};

export default Login;

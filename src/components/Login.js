import React, { useState, useCallback } from 'react';
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
import { GoogleLogin } from '@react-oauth/google';
import { styled } from '@mui/material/styles';

// Import translation hook
import { useTranslation } from 'react-i18next';

// Import API utilities
import { api, setCookie, getCookie } from '../utils/apiUtils';

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
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [reAuthMessage] = useState(location.state?.reAuthRequired ? t('login.reAuthRequired') : '');
  
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
      
      if (response.data.user) {
        // Set cookies first
        setCookie('user', response.data.user);
        setCookie('token', response.data.token);
        
        // Use window.location for a full page reload to ensure cookies are set
        window.location.href = '/dashboard';
      }
    } catch (error) {
      setError(error.response?.data?.message || t('login.errors.loginFailed'));
    }
  };

  // Google login handler
  const handleGoogleResponse = useCallback(async (response) => {
    try {
      // Debug Google response
      console.debug('Google Login Response:', {
        hasCredential: !!response.credential,
        credentialLength: response.credential?.length
      });

      const loginResponse = await api.post('/auth/google-login', {
        credential: response.credential
      });

      // Debug login response
      console.debug('Backend Login Response:', {
        status: loginResponse.status,
        hasToken: !!loginResponse.data.token,
        tokenLength: loginResponse.data.token?.length,
        hasUser: !!loginResponse.data.user
      });

      // Set token in cookie if it exists
      if (loginResponse.data.token) {
        setCookie('token', loginResponse.data.token, {
          path: '/',
          sameSite: 'lax',
          secure: process.env.NODE_ENV === 'production'
        });
      } else {
        console.error('No token received from server');
        throw new Error('No token received from server');
      }

      // Set user in cookie if it exists
      if (loginResponse.data.user) {
        setCookie('user', loginResponse.data.user, {
          path: '/',
          sameSite: 'lax',
          secure: process.env.NODE_ENV === 'production'
        });
      } else {
        console.error('No user data received from server');
        throw new Error('No user data received from server');
      }

      // Wait a bit for cookies to be set
      await new Promise(resolve => setTimeout(resolve, 100));

      // Debug cookie state after setting
      console.debug('Cookie State After Login:', {
        hasToken: !!getCookie('token'),
        tokenLength: getCookie('token')?.length,
        hasUser: !!getCookie('user')
      });

      // Navigate to dashboard
      navigate('/dashboard');
    } catch (error) {
      console.error('Google login error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      setError(error.response?.data?.message || 'Failed to login with Google');
    }
  }, [navigate]);

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
          <Box component="form" onSubmit={onSubmit} noValidate sx={{ mt: 1, width: '100%' }}>
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
                onSuccess={handleGoogleResponse}
                onError={() => {
                  console.error('Login Failed');
                  setError(t('login.errors.googleLoginFailed'));
                }}
                theme="outline"
                size="large"
                text="signin_with"
                shape="rectangular"
                width="100%"
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
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default Login;

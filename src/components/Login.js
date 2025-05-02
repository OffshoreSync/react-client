import React, { useState, useCallback, useContext } from 'react';
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
import { api, setCookie, getCookie } from '../utils/apiUtils';
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
  const { setUser } = useAuth();
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState(location.state?.successMessage || '');
  const [showVerificationAlert] = useState(location.state?.showVerificationAlert || false);
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

      // Store both tokens in cookies
      setCookie('token', response.data.token, {
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      });

      setCookie('refreshToken', response.data.refreshToken, {
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        httpOnly: true
      });

      // Set user data in context
      setUser(response.data.user);

      // Store user data in cookie for persistence
      setCookie('user', JSON.stringify(response.data.user), {
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      });

      setTimeout(() => {
  navigate('/dashboard');
}, 100);
    } catch (error) {
      console.error('Login error:', error);
      setError(error.response?.data?.message || t('login.errors.loginFailed'));
    }
  };

  // Google login handler
  const handleGoogleLogin = async (response) => {
    try {
      console.debug('Google response:', response);
      
      // Send the credential token to server
      const loginResponse = await api.post('/api/auth/google-login', { 
        credential: response.credential
      });

      console.debug('Login response:', loginResponse.data);

      if (!loginResponse.data.token || !loginResponse.data.refreshToken) {
        throw new Error('Invalid server response - missing tokens');
      }

      // Store both tokens in cookies
      setCookie('token', loginResponse.data.token, {
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      });

      setCookie('refreshToken', loginResponse.data.refreshToken, {
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        httpOnly: true
      });

      // Fetch user profile
      const profileResponse = await api.get('/api/auth/profile');
      console.debug('Profile loaded:', profileResponse.data);

      if (profileResponse.data.user) {
        setUser(profileResponse.data.user);

        // Store user data in cookie for persistence
        setCookie('user', JSON.stringify(profileResponse.data.user), {
          path: '/',
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax'
        });
      }

      setTimeout(() => {
  navigate('/dashboard');
}, 100);
    } catch (error) {
      console.error('Google login failed:', error);
      setError('Failed to authenticate with Google');
    }
  };

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
          elevation={3}
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
            <GoogleLogin
              onSuccess={handleGoogleLogin}
              onError={() => {
                console.error('Login Failed');
                setError(t('login.errors.googleLoginFailed'));
              }}
              size="large"
              width="100%"
              text="signin_with"
              shape="rectangular"
              logo_alignment="center"
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
          </form>
        </Paper>
      </Box>
    </Container>
  );
};

export default Login;

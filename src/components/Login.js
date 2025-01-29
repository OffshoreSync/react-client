import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { 
  Container, 
  Typography, 
  TextField, 
  Button, 
  Box, 
  Paper, 
  Link as MuiLink,
  Alert
} from '@mui/material';
import LoginIcon from '@mui/icons-material/Login';
import { GoogleLogin } from '@react-oauth/google';

// Import translation hook
import { useTranslation } from 'react-i18next';
import getBackendUrl from '../utils/apiUtils';
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

const Login = () => {
  const { t } = useTranslation(); // Add translation hook
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [error, setError] = useState('');

  const navigate = useNavigate();

  const { username, password } = formData;

  const onChange = e => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError(''); // Clear error when user starts typing
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const response = await axios.post(
        getBackendUrl('/api/auth/login'), 
        {
          username,
          password
        }
      );

      // Log the entire response for debugging
      console.log('Login Response:', JSON.stringify(response.data, null, 2));

      // Destructure and ensure all fields are present
      const { token, user } = response.data;

      // Ensure all expected fields are present
      const safeUser = {
        id: response.data.user.id,
        username: response.data.user.username,
        email: response.data.user.email,
        fullName: response.data.user.fullName,
        offshoreRole: response.data.user.offshoreRole,
        workingRegime: response.data.user.workingRegime,
        company: response.data.user.company || null,
        workSchedule: response.data.user.workSchedule || {
          nextOnBoardDate: null,
          nextOffBoardDate: null
        },
        unitName: response.data.user.unitName || null,
        country: response.data.user.country || null
      };

      // Store token and user data
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(safeUser));

      // Log stored user data for verification
      console.log('Stored User Data:', JSON.stringify(safeUser, null, 2));

      // Dispatch event to update profile picture
      window.dispatchEvent(new Event('profilePictureUpdated'));

      // Redirect to dashboard
      navigate('/dashboard');
    } catch (err) {
      console.error('Login error:', err.response?.data || err.message);
      setError(t('login.errors.loginFailed'));
    }
  };

  const handleGoogleLogin = async (credentialResponse) => {
    try {
      // Send full Google token to backend for verification
      const response = await axios.post(
        getBackendUrl('/api/auth/google-login'), 
        {
          googleToken: credentialResponse.credential
        }
      );

      // Log the entire response for debugging
      console.log('Google Login Response:', JSON.stringify(response.data, null, 2));

      // Destructure and ensure all fields are present
      const { token, user } = response.data;

      // Ensure all expected fields are present
      const safeUser = {
        id: user._id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        offshoreRole: user.offshoreRole,
        workingRegime: user.workingRegime,
        company: user.company || null,
        unitName: user.unitName || null,
        workSchedule: user.workSchedule || {
          nextOnBoardDate: null,
          nextOffBoardDate: null
        },
        country: user.country || null,
        profilePicture: user.profilePicture || null, // Ensure profilePicture is saved
        isGoogleUser: true  // Explicitly set to true for ALL Google logins
      };

      // Log the safe user object for verification
      console.log('Safe User Object:', JSON.stringify(safeUser, null, 2));

      // Store token and user data
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(safeUser));

      // Dispatch event to update profile picture
      window.dispatchEvent(new Event('profilePictureUpdated'));

      // Redirect to dashboard
      navigate('/dashboard');
    } catch (err) {
      console.error('Google Login error:', err.response?.data || err.message);
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
              type="password"
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={onChange}
            />
            
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

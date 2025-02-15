import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import getBackendUrl from '../utils/apiUtils';

// Material-UI Imports
import { 
  Box, 
  Button, 
  Container, 
  CssBaseline, 
  TextField, 
  Typography, 
  Paper, 
  Alert, 
  AlertTitle,
  IconButton,
  InputAdornment,
  Card,
  CardHeader,
  CardContent,
  CircularProgress
} from '@mui/material';
import { 
  Visibility, 
  VisibilityOff, 
  LockReset, 
  Email, 
  VpnKey 
} from '@mui/icons-material';

// Enhanced input validation functions
const validatePassword = (password) => {
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  const isValid = passwordRegex.test(password);

  console.log('Password validation:', {
    isValid,
    hasLowercase: /(?=.*[a-z])/.test(password),
    hasUppercase: /(?=.*[A-Z])/.test(password),
    hasNumber: /(?=.*\d)/.test(password),
    hasSpecialChar: /(?=.*[@$!%*?&])/.test(password),
    length: password.length
  });
  return isValid;
};

const PasswordReset = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const params = useParams();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [stage, setStage] = useState('request'); // 'request', 'check-email', 'reset'
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [passwordErrors, setPasswordErrors] = useState([]);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Check for token in URL query or route params
    const searchParams = new URLSearchParams(location.search);
    const urlToken = searchParams.get('token') || params.token;

    if (urlToken) {
      setResetToken(urlToken);
      setStage('reset');
    }
  }, [location.search, params.token]);

  useEffect(() => {
    if (params.token) {
      // Try to retrieve email from the previous password reset request
      const storedEmail = localStorage.getItem('resetEmail');
      if (storedEmail) {
        setEmail(storedEmail);
      }
    }
  }, [params.token]);

  const requestPasswordReset = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await axios.post(
        getBackendUrl('/api/password/request-reset'), 
        { email }
      );
      setMessage(t('passwordReset.requestSent'));
      setStage('check-email');
      localStorage.setItem('resetEmail', email);
    } catch (error) {
      console.error('Password reset request error:', error);
      setError(
        error.response?.data?.message || 
        t('passwordReset.requestError')
      );
    } finally {
      setIsLoading(false);
    }
  };

  const resetPassword = async (e) => {
    e.preventDefault();
    
    // Clear previous errors
    setPasswordErrors([]);
    setError('');

    // Attempt to retrieve email if not set
    const resetEmail = email || localStorage.getItem('resetEmail');

    // Log input details for debugging
    console.log('Password Reset Attempt:', {
      resetEmail,
      newPasswordLength: newPassword.length,
      confirmPasswordLength: confirmPassword.length,
      passwordsMatch: newPassword === confirmPassword,
      resetToken: resetToken ? 'Token Present' : 'No Token'
    });

    // Validate email
    if (!resetEmail) {
      setError(t('passwordReset.emailRequired'));
      return;
    }

    // Validate password
    if (!validatePassword(newPassword)) {
      const errors = [
        t('passwordReset.requirements.length'),
        t('passwordReset.requirements.uppercase'),
        t('passwordReset.requirements.lowercase'),
        t('passwordReset.requirements.number'),
        t('passwordReset.requirements.special')
      ];
      setPasswordErrors(errors);
      return;
    }

    // Check password confirmation
    if (newPassword !== confirmPassword) {
      setError(t('passwordReset.passwordMismatch'));
      return;
    }

    try {
      const response = await axios.post(
        getBackendUrl('/api/password/reset'), 
        { 
          token: resetToken, 
          newPassword, 
          confirmPassword,
          email: resetEmail
        }
      );
      
      console.log('Password Reset Response:', response.data);
      setMessage(t('passwordReset.success'));
      
      // Clear stored email
      localStorage.removeItem('resetEmail');
      
      // Redirect to login after successful reset
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (error) {
      console.error('Password reset error:', error.response || error);
      setError(
        error.response?.data?.message || 
        t('passwordReset.resetError')
      );
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <CssBaseline />
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >

        {/* Error and Success Messages */}
        {error && (
          <Alert 
            severity="error" 
            sx={{ mt: 2, width: '100%', maxWidth: 500 }}
          >
            <AlertTitle>{t('common.error')}</AlertTitle>
            {error}
          </Alert>
        )}
        {message && (
          <Alert 
            severity="success" 
            sx={{ mt: 2, width: '100%', maxWidth: 500 }}
          >
            <AlertTitle>{t('common.success')}</AlertTitle>
            {message}
          </Alert>
        )}

        {/* Request Reset Stage */}
        {stage === 'request' && (
          <Card 
            sx={{ 
              mt: 2, 
              width: '100%', 
              maxWidth: 500,
              margin: 'auto',
              borderRadius: 2,
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
            }}
          >
            <CardHeader
              title={
                <Typography variant="h5" align="center">
                  {t('passwordReset.title')}
                </Typography>
              }
              subheader={
                <Typography 
                  variant="body2" 
                  color="text.secondary" 
                  align="center" 
                  sx={{ mt: 1 }}
                >
                  {t('passwordReset.subtitle')}
                </Typography>
              }
              sx={{ pb: 0 }}
            />
            <CardContent>
              <Box 
                component="form" 
                onSubmit={requestPasswordReset} 
                noValidate 
                sx={{ width: '100%' }}
              >
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  id="email"
                  label={t('passwordReset.emailPlaceholder')}
                  name="email"
                  autoComplete="email"
                  autoFocus
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError('');
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Email />
                      </InputAdornment>
                    ),
                  }}
                />

                {error && (
                  <Alert 
                    severity="error" 
                    sx={{ mt: 2, width: '100%' }}
                  >
                    {error}
                  </Alert>
                )}

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  sx={{ mt: 3, mb: 2 }}
                  disabled={isLoading}
                >
                  {isLoading 
                    ? <CircularProgress size={24} /> 
                    : t('passwordReset.requestButton')
                  }
                </Button>
              </Box>
            </CardContent>
          </Card>
        )}

        {/* Check Email Stage */}
        {stage === 'check-email' && (
          <Paper 
            elevation={3} 
            sx={{ 
              p: 3, 
              mt: 2, 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center',
              width: '100%'
            }}
          >
            <Typography variant="body1" align="center" sx={{ mb: 2 }}>
              {t('passwordReset.checkEmailInstructions')}
            </Typography>
            <Typography variant="body2" color="text.secondary" align="center">
              {t('passwordReset.linkExpiration')}
            </Typography>
            <Button
              variant="outlined"
              color="primary"
              sx={{ mt: 2 }}
              onClick={() => setStage('request')}
            >
              {t('passwordReset.changeEmail')}
            </Button>
          </Paper>
        )}

        {/* Reset Password Stage */}
        {stage === 'reset' && (
          <Card 
            sx={{ 
              mt: 2, 
              width: '100%', 
              maxWidth: 500,
              margin: 'auto',
              borderRadius: 2,
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
            }}
          >
            <CardHeader 
              title={
                <Typography variant="h5" align="center">
                  {t('passwordReset.title')}
                </Typography>
              }
              subheader={
                <Typography 
                  variant="body2" 
                  color="text.secondary" 
                  align="center" 
                  sx={{ mt: 1 }}
                >
                  {t('passwordReset.subtitle')}
                </Typography>
              }
              sx={{ pb: 0 }}
            />
            <CardContent>
              <Box 
                component="form" 
                onSubmit={resetPassword} 
                noValidate 
                sx={{ width: '100%' }}
              >
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  name="newPassword"
                  label={t('passwordReset.newPasswordPlaceholder')}
                  type={showPassword ? 'text' : 'password'}
                  id="newPassword"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    setError('');
                    setPasswordErrors([]);
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <VpnKey />
                      </InputAdornment>
                    ),
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
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  name="confirmPassword"
                  label={t('passwordReset.confirmPasswordPlaceholder')}
                  type={showPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setError('');
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <VpnKey />
                      </InputAdornment>
                    ),
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

                {/* Password Requirements */}
                {passwordErrors.length > 0 && (
                  <Paper 
                    elevation={2} 
                    sx={{ 
                      mt: 2, 
                      p: 2, 
                      backgroundColor: 'background.default' 
                    }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      {t('passwordReset.passwordRequirements')}:
                    </Typography>
                    {passwordErrors.map((error, index) => (
                      <Typography 
                        key={index} 
                        variant="body2" 
                        color="error" 
                        sx={{ ml: 2 }}
                      >
                        • {error}
                      </Typography>
                    ))}
                  </Paper>
                )}

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  sx={{ mt: 3, mb: 2 }}
                >
                  {t('passwordReset.resetButton')}
                </Button>
              </Box>
            </CardContent>
          </Card>
        )}
      </Box>
    </Container>
  );
};

export default PasswordReset;

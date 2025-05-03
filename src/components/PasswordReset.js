import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import { api, publicApi, setCookie, getCookie, removeCookie } from '../utils/apiUtils';

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
  const { t, i18n } = useTranslation();
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
    // Retrieve reset email from cookies
    const storedEmail = getCookie('resetEmail');
    if (storedEmail) {
      setEmail(storedEmail);
    }
  }, []);

  const requestPasswordReset = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(''); // Clear any previous errors
    try {
      // Use publicApi utility to bypass authentication and CSRF token validation
      // for public endpoints like password reset
      await publicApi.post('password/request', { 
        email, 
        language: i18n.language || 'en' // Use current language or default to English
      });
      setMessage(t('passwordReset.requestSent'));
      setStage('check-email');
      setCookie('resetEmail', email, { 
        path: '/', 
        maxAge: 15 * 60 // 15 minutes
      });
    } catch (error) {
      console.error('Password reset request error:', error);
      
      // Specific error handling
      const errorMessage = error.response?.data?.message;
      const errorStatus = error.response?.status;
      
      if (errorStatus === 429) {
        // Explicitly handle Too Many Requests
        setError(t('passwordReset.tooManyAttempts'));
      } else if (errorMessage) {
        // Check for specific error conditions
        if (errorMessage.toLowerCase().includes('too many reset attempts')) {
          // Use a single, localized error message for too many attempts
          setError(t('passwordReset.tooManyAttempts'));
        } else {
          // Generic error message for other cases
          setError(errorMessage);
        }
      } else {
        // Fallback to generic error if no specific message
        setError(t('passwordReset.requestError'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const resetPassword = async (e) => {
    e.preventDefault();
    
    // Clear previous errors
    setPasswordErrors([]);
    setError('');
    setIsLoading(true);
    
    try {
      // Attempt to retrieve email if not set
      if (!email && resetToken) {
        try {
          // Try to extract email from token using publicApi utility
          const response = await publicApi.post('password/verify-token', { token: resetToken });
          if (response.data.email) {
            setEmail(response.data.email);
          }
        } catch (error) {
          console.error('Error validating token:', error);
          // Continue with reset attempt even if validation fails
        }
      }

      // Validate passwords match
      if (newPassword !== confirmPassword) {
        setError(t('passwordReset.passwordsMismatch'));
        setIsLoading(false);
        return;
      }
      
      // Validate password strength
      if (!validatePassword(newPassword)) {
        setPasswordErrors([
          t('passwordReset.passwordRequirements1'),
          t('passwordReset.passwordRequirements2'),
          t('passwordReset.passwordRequirements3'),
          t('passwordReset.passwordRequirements4')
        ]);
        setIsLoading(false);
        return;
      }
      
      // Call API to reset password
      const response = await publicApi.post('password/reset', {
        token: resetToken,
        password: newPassword,
        email
      });
      console.log('Password Reset Response:', response.data);
      setMessage(t('passwordReset.success'));
      
      // Clear stored email cookie
      removeCookie('resetEmail', { path: '/' });
      
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

        {/* Success Messages */}
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
            {error && (
              <Alert 
                severity="error" 
                sx={{ 
                  width: '100%', 
                  borderRadius: 0,
                  mb: 2
                }}
              >
                {error}
              </Alert>
            )}
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
                sx={{ mt: 1 }}
              >
                <TextField
                  variant="outlined"
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
                    setError(''); // Clear error when user starts typing
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Email />
                      </InputAdornment>
                    )
                  }}
                />
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  color="primary"
                  sx={{ mt: 3, mb: 2 }}
                  disabled={isLoading}
                  startIcon={isLoading ? <CircularProgress size={20} /> : <LockReset />}
                >
                  {isLoading 
                    ? t('passwordReset.sendingRequest') 
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
            {error && (
              <Alert 
                severity="error" 
                sx={{ 
                  width: '100%', 
                  borderRadius: 0,
                  mb: 2
                }}
              >
                {error}
              </Alert>
            )}
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
                  {t('passwordReset.resetSubtitle')}
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

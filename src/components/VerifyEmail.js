import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Container, 
  Typography, 
  Button, 
  Box,
  Card,
  CardContent,
  CardActions,
  Alert,
  CircularProgress
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { api } from '../utils/apiUtils';

const VerifyEmail = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [verifying, setVerifying] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const verifyEmail = async () => {
      // Get token from URL search params
      const searchParams = new URLSearchParams(location.search);
      const token = searchParams.get('token');

      if (!token) {
        setError(t('verifyEmail.errors.missingToken'));
        setVerifying(false);
        return;
      }

      try {
        await api.post('/auth/verify-email', { token });
        setSuccess(t('verifyEmail.success.message'));
        // Redirect to login with success message
        setTimeout(() => {
          navigate('/login', {
            state: {
              successMessage: t('verifyEmail.success.message'),
              showVerificationAlert: true
            }
          });
        }, 3000);
      } catch (error) {
        console.error('Email verification error:', error);
        setError(
          error.response?.data?.message || 
          t('verifyEmail.errors.verificationFailed')
        );
      } finally {
        setVerifying(false);
      }
    };

    verifyEmail();
  }, [location.search, navigate, t]);

  return (
    <Container maxWidth="sm">
      <Box sx={{ 
        minHeight: '80vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        py: 4,
        mt: -8
      }}>
        <Card sx={{ width: '100%', textAlign: 'center' }}>
          <CardContent>
            <Typography variant="h5" component="h1" gutterBottom>
              {t('verifyEmail.title')}
            </Typography>

            {verifying ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', my: 4 }}>
                <CircularProgress size={40} sx={{ mb: 2 }} />
                <Typography variant="body1">
                  {t('verifyEmail.verifying')}
                </Typography>
              </Box>
            ) : (
              <Box sx={{ my: 2 }}>
                {error ? (
                  <Alert 
                    severity="error" 
                    sx={{ 
                      mb: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {error}
                  </Alert>
                ) : (
                  <Alert 
                    severity="success"
                    sx={{ 
                      mb: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {success}
                  </Alert>
                )}
              </Box>
            )}
          </CardContent>

          {!verifying && !success && (
            <CardActions sx={{ 
              justifyContent: 'center', 
              pb: 3,
              gap: 2 
            }}>
              <Button
                variant="outlined"
                color="error"
                onClick={() => navigate('/')}
              >
                {t('verifyEmail.buttons.goToHome')}
              </Button>
              <Button
                variant="contained"
                color="primary"
                onClick={() => navigate('/login')}
              >
                {t('verifyEmail.buttons.goToLogin')}
              </Button>
            </CardActions>
          )}
        </Card>
      </Box>
    </Container>
  );
};

export default VerifyEmail;
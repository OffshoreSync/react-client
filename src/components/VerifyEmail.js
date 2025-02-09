import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { 
  Container, 
  Typography, 
  Box, 
  Button, 
  CircularProgress 
} from '@mui/material';

import getBackendUrl from '../utils/apiUtils';

const VerifyEmail = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [isVerifying, setIsVerifying] = useState(true);
  const [verificationStatus, setVerificationStatus] = useState({
    success: false,
    message: '',
    alreadyVerified: false
  });

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        // Extract token from URL query parameters
        const searchParams = new URLSearchParams(location.search);
        const token = searchParams.get('token');

        if (!token) {
          throw new Error('No verification token provided');
        }

        // Call backend verification endpoint
        const response = await axios.get(
          `${getBackendUrl()}/api/auth/verify-email?token=${token}`
        );

        setVerificationStatus({
          success: true,
          message: response.data.message || t('verifyEmail.success.message'),
          alreadyVerified: response.data.alreadyVerified || false
        });
      } catch (error) {
        setVerificationStatus({
          success: false,
          message: error.response?.data?.error || 
                   t('verifyEmail.error.serverError'),
          alreadyVerified: false
        });
      } finally {
        setIsVerifying(false);
      }
    };

    verifyEmail();
  }, [location.search, t]);

  const handleRedirectToLogin = () => {
    navigate('/login');
  };

  return (
    <Container maxWidth="xs">
      <Box 
        sx={{ 
          marginTop: 8, 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          textAlign: 'center'
        }}
      >
        {isVerifying ? (
          <>
            <Typography variant="h5" sx={{ mb: 2 }}>
              {t('verifyEmail.title')}
            </Typography>
            <CircularProgress />
            <Typography variant="body1" sx={{ mt: 2 }}>
              {t('verifyEmail.success.message')}
            </Typography>
          </>
        ) : (
          <>
            <Typography 
              component="h1" 
              variant="h5"
              color={verificationStatus.success ? 'primary' : 'error'}
              sx={{ mb: 2 }}
            >
              {verificationStatus.success 
                ? (verificationStatus.alreadyVerified 
                    ? t('verifyEmail.success.title') 
                    : t('verifyEmail.success.title'))
                : t('verifyEmail.error.title')
              }
            </Typography>
            
            <Typography 
              variant="body1" 
              sx={{ mb: 3 }}
            >
              {verificationStatus.message}
            </Typography>
            
            <Button
              variant="contained"
              color="primary"
              onClick={handleRedirectToLogin}
              sx={{ mt: 2 }}
            >
              {t('verifyEmail.buttons.goToLogin')}
            </Button>
          </>
        )}
      </Box>
    </Container>
  );
};

export default VerifyEmail;
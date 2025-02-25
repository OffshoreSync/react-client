import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { 
  Container, 
  Typography, 
  Button, 
  Box, 
  Paper, 
  Alert,
  CircularProgress
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { api } from '../utils/apiUtils';

const VerifyEmail = () => {
  const { token } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [verifying, setVerifying] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const verifyEmail = async () => {
      if (!token) {
        setVerifying(false);
        return;
      }

      try {
        await api.post('/api/auth/verify-email', { token });
        setSuccess(t('verifyEmail.success'));
        setTimeout(() => navigate('/login'), 3000);
      } catch (error) {
        console.error('Email verification error:', error);
        setError(t('verifyEmail.errors.verificationFailed'));
      } finally {
        setVerifying(false);
      }
    };

    verifyEmail();
  }, [token, navigate, t]);

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
        {verifying ? (
          <>
            <Typography variant="h5" sx={{ mb: 2 }}>
              {t('verifyEmail.title')}
            </Typography>
            <CircularProgress />
            <Typography variant="body1" sx={{ mt: 2 }}>
              {t('verifyEmail.verifying')}
            </Typography>
          </>
        ) : (
          <>
            {error && (
              <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
                {error}
              </Alert>
            )}

            <Typography 
              component="h1" 
              variant="h5"
              color={success ? 'primary' : 'error'}
              sx={{ mb: 2 }}
            >
              {success ? t('verifyEmail.success.title') : t('verifyEmail.error.title')}
            </Typography>
            
            <Typography 
              variant="body1" 
              sx={{ mb: 3 }}
            >
              {success ? success : error}
            </Typography>
            
            {!success && (
              <Button
                variant="contained"
                color="primary"
                onClick={() => navigate('/login')}
                sx={{ mt: 2 }}
              >
                {t('verifyEmail.buttons.goToLogin')}
              </Button>
            )}
          </>
        )}
      </Box>
    </Container>
  );
};

export default VerifyEmail;
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Container,
  Typography,
  Card,
  CardContent,
  CardHeader,
  Grid,
  Button,
  Snackbar,
  Alert,
  Box,
  Divider,
  Paper,
  TextField,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  ContentCopy as ContentCopyIcon,
  CurrencyBitcoin as BitcoinIcon,
  Payment as PaymentIcon,
  AccountBalance as BankIcon,
  Paid as PaidIcon,
  CurrencyExchange as CurrencyIcon
} from '@mui/icons-material';

const Donations = () => {
  const { t } = useTranslation();
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  // Donation details
  const donationMethods = {
    wise: {
      title: 'Wise',
      icon: <BankIcon fontSize="large" />,
      description: t('donations.wiseDescription'),
      details: process.env.REACT_APP_WISE_DETAILS || 'email@example.com',
      link: process.env.REACT_APP_WISE_LINK || 'https://wise.com'
    },
    paypal: {
      title: 'PayPal',
      icon: <PaymentIcon fontSize="large" />,
      description: t('donations.paypalDescription'),
      details: process.env.REACT_APP_PAYPAL_DETAILS || 'donate@offshoresync.com',
      link: process.env.REACT_APP_PAYPAL_LINK || 'https://paypal.me/offshoresync'
    },
    revolut: {
      title: 'Revolut',
      icon: <CurrencyIcon fontSize="large" />,
      description: t('donations.revolutDescription'),
      details: process.env.REACT_APP_REVOLUT_DETAILS || '@offshoresync',
      link: process.env.REACT_APP_REVOLUT_LINK || 'https://revolut.me/offshoresync'
    },
    bitcoin: {
      title: 'Bitcoin',
      icon: <BitcoinIcon fontSize="large" />,
      description: t('donations.bitcoinDescription'),
      details: process.env.REACT_APP_BITCOIN_ADDRESS || '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
      link: process.env.REACT_APP_BITCOIN_LINK || null
    },
    ethereum: {
      title: 'Ethereum',
      icon: <PaidIcon fontSize="large" />,
      description: t('donations.ethereumDescription'),
      details: process.env.REACT_APP_ETHEREUM_ADDRESS || '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
      link: process.env.REACT_APP_ETHEREUM_LINK || null
    }
  };

  // Handle copying to clipboard
  const handleCopy = (text) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        setSnackbarMessage(t('donations.copiedToClipboard'));
        setSnackbarOpen(true);
      })
      .catch((error) => {
        console.error('Failed to copy: ', error);
        setSnackbarMessage(t('donations.copyFailed'));
        setSnackbarOpen(true);
      });
  };

  // Handle snackbar close
  const handleSnackbarClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbarOpen(false);
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Card sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <img 
            src="/offshoresync_logo_nobg.svg" 
            alt="OffshoreSync Logo" 
            style={{ 
              height: 80,
              marginBottom: 16
            }} 
          />
        </Box>
        <CardHeader 
          title={t('donations.title')} 
          titleTypographyProps={{ 
            align: 'center', 
            variant: 'h4', 
            fontWeight: 'bold',
            color: 'primary.main'
          }}
        />
        <CardHeader 
          title={t('donations.supportTitle')} 
          titleTypographyProps={{ 
            align: 'center', 
            variant: 'h5'
          }}
        />
        <CardContent>
          <Typography variant="body1" paragraph>
            {t('donations.mainDescription1')}
          </Typography>
          <Typography variant="body1" paragraph>
            {t('donations.mainDescription2')}
          </Typography>
          <Typography variant="body1" paragraph>
            {t('donations.mainDescription3')}
          </Typography>
          <Typography variant="body1" paragraph>
            {t('donations.donationMethods')}
          </Typography>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        {Object.entries(donationMethods).map(([key, method]) => (
          <Grid item xs={12} md={6} key={key}>
            <Paper 
              elevation={3} 
              sx={{ 
                p: 3, 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-5px)',
                  boxShadow: 6
                }
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Box sx={{ mr: 2, color: 'primary.main' }}>
                  {method.icon}
                </Box>
                <Typography variant="h6">{method.title}</Typography>
              </Box>
              
              <Typography variant="body2" paragraph>
                {method.description}
              </Typography>
              
              <Box sx={{ mt: 'auto', display: 'flex', alignItems: 'center' }}>
                <TextField
                  fullWidth
                  variant="outlined"
                  size="small"
                  value={method.details}
                  InputProps={{
                    readOnly: true,
                  }}
                  sx={{ mr: 1 }}
                />
                <Tooltip title={t('donations.copyToClipboard')}>
                  <IconButton 
                    onClick={() => handleCopy(method.details)}
                    color="primary"
                  >
                    <ContentCopyIcon />
                  </IconButton>
                </Tooltip>
              </Box>
              
              {method.link && (
                <Button 
                  variant="outlined" 
                  color="primary" 
                  href={method.link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  sx={{ mt: 2 }}
                >
                  {t('donations.donateVia', { method: method.title })}
                </Button>
              )}
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Box sx={{ mt: 6, mb: 4, textAlign: 'center' }}>
        <Typography variant="h6" gutterBottom>
          {t('donations.thankYou')}
        </Typography>
        <Typography variant="body1">
          {t('donations.contactUs')}
        </Typography>
      </Box>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleSnackbarClose} severity="success">
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Donations;

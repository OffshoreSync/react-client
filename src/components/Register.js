import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { 
  Container, 
  Typography, 
  TextField, 
  Button, 
  Box, 
  MenuItem, 
  Select, 
  FormControl, 
  InputLabel, 
  Paper, 
  Alert 
} from '@mui/material';
import { OFFSHORE_COUNTRIES, getTranslatedCountries } from '../utils/countries';
import { OFFSHORE_ROLES, getTranslatedRoles } from '../utils/offshoreRoles';

const Register = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const [isGoogleLogin, setIsGoogleLogin] = useState(false);
  const [googleUserData, setGoogleUserData] = useState(null);

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    fullName: '',
    offshoreRole: '',
    workingRegime: '28/28', // Default to 28/28
    customOnDutyDays: '',
    customOffDutyDays: '',
    company: '',
    unitName: '',
    country: ''
  });
  const [error, setError] = useState('');

  const navigate = useNavigate();

  const { 
    username, 
    email, 
    password, 
    fullName, 
    offshoreRole, 
    workingRegime,
    customOnDutyDays,
    customOffDutyDays,
    company, 
    unitName,
    country 
  } = formData;

  useEffect(() => {
    // Check if there's Google login data passed from Login component
    const googleData = location.state?.googleUserData;
    if (googleData) {
      setIsGoogleLogin(true);
      setGoogleUserData(googleData);
      
      // Pre-fill form with Google data
      setFormData(prevState => ({
        ...prevState,
        email: googleData.email,
        fullName: googleData.name,
        username: googleData.email.split('@')[0], // Use email prefix as username
      }));
    }
  }, [location.state]);

  const onChange = e => {
    // Disable changes if Google login
    if (isGoogleLogin && e.target.name !== 'password' && e.target.name !== 'offshoreRole' && e.target.name !== 'workingRegime' && e.target.name !== 'customOnDutyDays' && e.target.name !== 'customOffDutyDays' && e.target.name !== 'company' && e.target.name !== 'unitName' && e.target.name !== 'country') {
      return;
    }
    const { name, value } = e.target;
    setFormData(prevState => {
      // Special handling for working regime
      if (name === 'workingRegime') {
        // If predefined regime is selected, reset custom inputs
        if (value !== 'custom') {
          return {
            ...prevState,
            workingRegime: value,
            customOnDutyDays: '',
            customOffDutyDays: ''
          };
        }
      }

      // Normal input handling
      return {
        ...prevState,
        [name]: value
      };
    });
    setError(''); // Clear error when user starts typing
  };

  const onSubmit = async e => {
    e.preventDefault();
    try {
      // Determine working regime
      let finalWorkingRegime;
      if (workingRegime === 'custom') {
        const onDutyDays = parseInt(customOnDutyDays, 10);
        const offDutyDays = parseInt(customOffDutyDays, 10);

        // Validate custom working regime
        if (isNaN(onDutyDays) || isNaN(offDutyDays)) {
          setError(t('register.errors.invalidWorkingRegime'));
          return;
        }

        if (onDutyDays < 7 || offDutyDays < 7) {
          setError(t('register.errors.minimumWorkingDays'));
          return;
        }

        if (onDutyDays + offDutyDays > 365) {
          setError(t('register.errors.maximumWorkingDays'));
          return;
        }

        finalWorkingRegime = { 
          onDutyDays, 
          offDutyDays 
        };
      } else {
        // Predefined regimes
        const [onDutyDays, offDutyDays] = workingRegime.split('/').map(Number);
        finalWorkingRegime = { 
          onDutyDays, 
          offDutyDays 
        };
      }

      // Remove empty strings for optional fields
      const submitData = {
        ...formData,
        workingRegime: finalWorkingRegime,
        company: company.trim() || null,
        unitName: unitName.trim() || null
      };

      // Remove custom working regime inputs from submitted data
      delete submitData.customOnDutyDays;
      delete submitData.customOffDutyDays;

      const res = await axios.post('http://localhost:5000/api/auth/register', {
        ...submitData,
        googleLogin: isGoogleLogin
      });
      
      // Store user token and info in localStorage
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));

      // Redirect to dashboard or main app page
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || t('register.errors.registrationFailed'));
    }
  };

  return (
    <Container maxWidth="sm">
      <Paper elevation={3} sx={{ p: 4, mt: 4 }}>
        <Typography variant="h4" gutterBottom align="center">
          {isGoogleLogin ? t('register.completeProfile') : t('register.title')}
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={onSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            fullWidth
            label={t('register.emailAddress')}
            name="email"
            value={email}
            onChange={onChange}
            required
            variant="outlined"
            disabled={isGoogleLogin}
            InputProps={{
              readOnly: isGoogleLogin
            }}
          />
          
          <TextField
            fullWidth
            label={t('register.fullName')}
            name="fullName"
            value={fullName}
            onChange={onChange}
            required
            variant="outlined"
            disabled={isGoogleLogin}
            InputProps={{
              readOnly: isGoogleLogin
            }}
          />
          
          <TextField
            fullWidth
            label={t('register.username')}
            name="username"
            value={username}
            onChange={onChange}
            required
            variant="outlined"
            disabled={isGoogleLogin}
            InputProps={{
              readOnly: isGoogleLogin
            }}
          />
          
          <TextField
            fullWidth
            type="password"
            label={t('register.password')}
            name="password"
            value={password}
            onChange={onChange}
            required
            variant="outlined"
            inputProps={{ minLength: 6 }}
          />
          
          <FormControl fullWidth required sx={{ mb: 2 }}>
            <InputLabel>{t('register.offshoreRole')}</InputLabel>
            <Select
              name="offshoreRole"
              value={offshoreRole}
              label={t('register.offshoreRole')}
              onChange={onChange}
              required
            >
              {getTranslatedRoles().map((role, index) => (
                <MenuItem key={OFFSHORE_ROLES[index]} value={OFFSHORE_ROLES[index]}>
                  {role}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <FormControl fullWidth required sx={{ mb: 2 }}>
            <InputLabel>{t('register.workingRegime')}</InputLabel>
            <Select
              name="workingRegime"
              value={workingRegime}
              label={t('register.workingRegime')}
              onChange={onChange}
            >
              <MenuItem value="7/7">7/7</MenuItem>
              <MenuItem value="14/14">14/14</MenuItem>
              <MenuItem value="28/28">28/28</MenuItem>
              <MenuItem value="custom">{t('register.customRegime')}</MenuItem>
            </Select>
          </FormControl>
          
          {workingRegime === 'custom' && (
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                type="number"
                label={t('register.customOnDutyDays')}
                name="customOnDutyDays"
                value={customOnDutyDays}
                onChange={onChange}
                inputProps={{ min: 7, max: 365 }}
                required
                variant="outlined"
              />
              <TextField
                fullWidth
                type="number"
                label={t('register.customOffDutyDays')}
                name="customOffDutyDays"
                value={customOffDutyDays}
                onChange={onChange}
                inputProps={{ min: 7, max: 365 }}
                required
                variant="outlined"
              />
            </Box>
          )}
          
          <TextField
            fullWidth
            label={t('register.company')}
            name="company"
            value={company}
            onChange={onChange}
            variant="outlined"
          />
          <TextField
            fullWidth
            label={t('register.unitName')}
            name="unitName"
            value={unitName}
            onChange={onChange}
            variant="outlined"
          />
          <FormControl fullWidth required sx={{ mb: 2 }}>
            <InputLabel>{t('register.country')}</InputLabel>
            <Select
              name="country"
              value={country}
              label={t('register.country')}
              onChange={onChange}
            >
              <MenuItem value="">Select Country</MenuItem>
              {getTranslatedCountries().map(country => (
                <MenuItem key={country.code} value={country.name}>
                  {country.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <Button 
            type="submit" 
            variant="contained" 
            color="primary" 
            size="large"
            sx={{ mt: 2 }}
          >
            {isGoogleLogin ? t('register.completeProfileButton') : t('register.registerButton')}
          </Button>
        </Box>

        <Typography variant="body2" align="center" sx={{ mt: 2 }}>
          {t('register.alreadyHaveAccount')}{' '}
          <Link to="/login" style={{ textDecoration: 'none' }}>
            {t('register.loginLink')}
          </Link>
        </Typography>
      </Paper>
    </Container>
  );
}

export default Register;

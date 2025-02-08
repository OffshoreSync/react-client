import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import getBackendUrl from '../utils/apiUtils';
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

// Enhanced input validation functions
const validateUsername = (username) => {
  // Allow only alphanumeric characters and underscores
  // 3-20 characters long
  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
  return usernameRegex.test(username);
};

const validateEmail = (email) => {
  // Standard email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePassword = (password) => {
  // Require:
  // - Minimum 8 characters
  // - At least one uppercase letter
  // - At least one lowercase letter
  // - At least one number
  // - At least one special character
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  const isValid = passwordRegex.test(password);
  console.log('Password validation:', {
    password,
    isValid,
    hasLowercase: /(?=.*[a-z])/.test(password),
    hasUppercase: /(?=.*[A-Z])/.test(password),
    hasNumber: /(?=.*\d)/.test(password),
    hasSpecialChar: /(?=.*[@$!%*?&])/.test(password),
    length: password.length
  });
  return isValid;
};

const Register = () => {
  const { t, i18n } = useTranslation();
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
    country: ['', ''] // Store as [countryCode, countryName]
  });
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({
    username: '',
    email: '',
    password: '',
    fullName: '',
    offshoreRole: '',
    country: '',
    workingRegime: '',
    customWorkingRegime: ''
  });

  const [registrationAttempts, setRegistrationAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockExpiry, setLockExpiry] = useState(null);

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

  useEffect(() => {
    // Update country name when language changes
    const updateCountryName = () => {
      if (formData.country[0]) {
        // Find the country object by its current code
        const countryObj = OFFSHORE_COUNTRIES.find(c => c.code === formData.country[0]);

        if (countryObj) {
          const translatedCountryName = t(`countries.${countryObj.code}`);
          
          // Only update if the translated name is different from the current name
          if (translatedCountryName.toLowerCase() !== formData.country[1].toLowerCase()) {
            setFormData(prevState => ({
              ...prevState,
              country: [prevState.country[0], translatedCountryName]
            }));
          }
        }
      }
    };

    // Initial translation
    updateCountryName();

    // Optional: Add event listener for language changes if needed
    const languageChangeHandler = () => {
      updateCountryName();
    };

    i18n.on('languageChanged', languageChangeHandler);

    // Cleanup
    return () => {
      i18n.off('languageChanged', languageChangeHandler);
    };
  }, [formData.country[0], i18n.language, t]);

  useEffect(() => {
    const checkLockStatus = () => {
      const storedLockExpiry = localStorage.getItem('registrationLockExpiry');
      if (storedLockExpiry) {
        const expiryTime = parseInt(storedLockExpiry, 10);
        if (Date.now() < expiryTime) {
          setIsLocked(true);
          setLockExpiry(expiryTime);
        } else {
          // Lock period has expired
          localStorage.removeItem('registrationLockExpiry');
          setIsLocked(false);
          setRegistrationAttempts(0);
        }
      }
    };

    checkLockStatus();
    const intervalId = setInterval(checkLockStatus, 60000); // Check every minute
    return () => clearInterval(intervalId);
  }, []);

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
    setErrors(prevState => ({ ...prevState, [name]: '' }));
  };

  const validateForm = () => {
    const newErrors = {};

    // Enhanced validations
    if (!validateUsername(username)) {
      newErrors.username = t('register.errors.invalidUsername');
    }

    if (!validateEmail(email)) {
      newErrors.email = t('register.errors.invalidEmail');
    }

    if (!validatePassword(password)) {
      newErrors.password = t('register.errors.invalidPassword', {
        requirements: [
          'Minimum 8 characters',
          'At least one uppercase letter',
          'At least one lowercase letter', 
          'At least one number',
          'At least one special character'
        ].join(', ')
      });
    }

    // Existing validations...
    if (!fullName) newErrors.fullName = t('register.errors.requiredField');
    if (!offshoreRole) newErrors.offshoreRole = t('register.errors.requiredField');
    if (!formData.country[0]) newErrors.country = t('register.errors.requiredField');

    if (workingRegime === 'custom') {
      const onDutyDays = parseInt(customOnDutyDays, 10);
      const offDutyDays = parseInt(customOffDutyDays, 10);

      if (isNaN(onDutyDays) || isNaN(offDutyDays)) {
        newErrors.customWorkingRegime = t('register.errors.invalidWorkingRegime');
      } else {
        if (onDutyDays < 7 || offDutyDays < 7) {
          newErrors.customWorkingRegime = t('register.errors.minimumWorkingDays');
        }
        if (onDutyDays + offDutyDays > 365) {
          newErrors.customWorkingRegime = t('register.errors.maximumWorkingDays');
        }
      }
    }

    setError(Object.keys(newErrors).length > 0 ? t('register.errors.formError') : '');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Check if registration is locked
    if (isLocked) {
      const remainingTime = Math.ceil((lockExpiry - Date.now()) / 60000);
      setError(t('register.errors.tooManyAttempts', { minutes: remainingTime }));
      return;
    }

    // Validate form
    if (!validateForm()) return;

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

      // Prepare data for submission
      const submitData = {
        username,
        email,
        password,
        fullName,
        offshoreRole,
        workingRegime: finalWorkingRegime,
        company: company.trim() || null,
        unitName: unitName.trim() || null,
        country: formData.country[0] // Use country code for submission
      };

      // Remove custom working regime inputs from submitted data
      delete submitData.customOnDutyDays;
      delete submitData.customOffDutyDays;

      // Determine registration method
      const registrationEndpoint = isGoogleLogin 
        ? getBackendUrl('/api/auth/google-register')
        : getBackendUrl('/api/auth/register');

      const response = await axios.post(registrationEndpoint, submitData, {
        // Add CSRF protection if using cookies
        withCredentials: true,
        // Add additional headers for security
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      // Reset registration attempts
      setRegistrationAttempts(0);
      localStorage.removeItem('registrationLockExpiry');

      // Sanitize and secure user data storage
      const safeUser = {
        id: response.data.user._id,
        username: response.data.user.username,
        email: response.data.user.email,
        fullName: response.data.user.fullName,
        offshoreRole: response.data.user.offshoreRole,
        workingRegime: response.data.user.workingRegime,
        company: response.data.user.company || null,
        unitName: response.data.user.unitName || null,
        workSchedule: response.data.user.workSchedule || {
          nextOnBoardDate: null,
          nextOffBoardDate: null
        },
        country: response.data.user.country || null
      };

      // Secure token storage
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(safeUser));

      // Clear password from memory
      setFormData(prev => ({ ...prev, password: '' }));

      navigate('/dashboard');
    } catch (err) {
      // Increment registration attempts
      const newAttempts = registrationAttempts + 1;
      setRegistrationAttempts(newAttempts);

      // Lock registration after 5 failed attempts
      if (newAttempts >= 5) {
        const lockExpiryTime = Date.now() + (15 * 60 * 1000); // 15 minutes
        setIsLocked(true);
        setLockExpiry(lockExpiryTime);
        localStorage.setItem('registrationLockExpiry', lockExpiryTime.toString());
        setError(t('register.errors.tooManyAttempts'));
        return;
      }

      console.error('Registration error:', err.response?.data || err.message);
      setError(t('register.errors.registrationFailed'));
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

        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
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
            error={!!errors.username}
            helperText={errors.username}
          />

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
            error={!!errors.email}
            helperText={errors.email}
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
            error={!!errors.fullName}
            helperText={errors.fullName}
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
            error={!!errors.password}
            helperText={errors.password}
          />
          
          <FormControl fullWidth required sx={{ mb: 2 }}>
            <InputLabel>{t('register.offshoreRole')}</InputLabel>
            <Select
              name="offshoreRole"
              value={offshoreRole}
              label={t('register.offshoreRole')}
              onChange={onChange}
              required
              error={!!errors.offshoreRole}
            >
              {getTranslatedRoles().map((role, index) => (
                <MenuItem key={OFFSHORE_ROLES[index]} value={OFFSHORE_ROLES[index]}>
                  {role}
                </MenuItem>
              ))}
            </Select>
            {errors.offshoreRole && <div style={{ color: 'red' }}>{errors.offshoreRole}</div>}
          </FormControl>
          
          <FormControl fullWidth required sx={{ mb: 2 }}>
            <InputLabel>{t('register.workingRegime')}</InputLabel>
            <Select
              name="workingRegime"
              value={workingRegime}
              label={t('register.workingRegime')}
              onChange={onChange}
              error={!!errors.workingRegime}
            >
              <MenuItem value="7/7">7/7</MenuItem>
              <MenuItem value="14/14">14/14</MenuItem>
              <MenuItem value="28/28">28/28</MenuItem>
              <MenuItem value="custom">{t('register.customRegime')}</MenuItem>
            </Select>
            {errors.workingRegime && <div style={{ color: 'red' }}>{errors.workingRegime}</div>}
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
                error={!!errors.customWorkingRegime}
                helperText={errors.customWorkingRegime}
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
                error={!!errors.customWorkingRegime}
                helperText={errors.customWorkingRegime}
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
              value={formData.country[1]} // Use country name for display
              label={t('register.country')}
              onChange={(e) => {
                // Find the corresponding country object
                const selectedCountry = getTranslatedCountries().find(c => 
                  t(`countries.${c.code}`) === e.target.value
                );
                
                if (selectedCountry) {
                  setFormData(prev => ({
                    ...prev,
                    country: [selectedCountry.code, t(`countries.${selectedCountry.code}`)]
                  }));
                }
              }}
              error={!!errors.country}
            >
              <MenuItem value="">Select Country</MenuItem>
              {getTranslatedCountries().map(country => (
                <MenuItem key={country.code} value={t(`countries.${country.code}`)}>
                  {t(`countries.${country.code}`)}
                </MenuItem>
              ))}
            </Select>
            {errors.country && <div style={{ color: 'red' }}>{errors.country}</div>}
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

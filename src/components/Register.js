import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  TextField, 
  Button, 
  Box, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  FormHelperText, 
  Paper, 
  Alert,
  IconButton,
  InputAdornment,
  Snackbar
} from '@mui/material';
import { 
  Visibility, 
  VisibilityOff 
} from '@mui/icons-material';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import axios from 'axios';
import { api, getCookie, setCookie, removeCookie } from '../utils/apiUtils';
import { 
  OFFSHORE_COUNTRIES, 
  getTranslatedCountries 
} from '../utils/countries';
import { 
  OFFSHORE_ROLES, 
  getTranslatedRoles 
} from '../utils/offshoreRoles';

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
  const navigate = useNavigate();
  const location = useLocation();
  const [isGoogleLogin, setIsGoogleLogin] = useState(false);
  const [googleUserData, setGoogleUserData] = useState(null);
  const [isLocked, setIsLocked] = useState(false);
  const [lockExpiry, setLockExpiry] = useState(null);
  const [registrationAttempts, setRegistrationAttempts] = useState(0);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  // New state for password visibility
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Password visibility toggle handlers
  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const handleClickShowConfirmPassword = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  const handleMouseDownPassword = (event) => {
    event.preventDefault();
  };

  // Disposable email domains list
  const DISPOSABLE_DOMAINS = [
    'mailinator.com', 'guerrillamail.com', 'guerrillamail.net', 'guerrillamail.org',
    'guerrillamail.biz', 'temp-mail.org', '10minutemail.com', 'throwawaymail.com', 
    'tempmail.com', 'tempmail.net', 'tempemail.com', 'tempemails.com', 'tempemails.net',
    'emailtemporaire.com', 'jetable.org', 'noemail.xyz', 'spam4.me', 'yopmail.com',
    'dispostable.com', 'sharklasers.com', 'guerrillamail.info', 'grr.la', 'spam.la',
    'pokemail.net', 'temp.email', 'dropmail.me', 'fakeinbox.com', '33mail.com'
  ];

  // Dynamic password validation schema
  const PasswordValidationSchema = Yup.object().shape({
    username: Yup.string()
      .min(3, t('register.errors.usernameTooShort'))
      .max(50, t('register.errors.usernameTooLong'))
      .required(t('register.errors.usernameRequired')),
    
    email: Yup.string()
      .email(t('register.errors.invalidEmail'))
      .test('no-disposable-email', t('register.errors.disposableEmail'), (value) => {
        // If value is empty or undefined, let other validators handle it
        if (!value) return true;
        
        // Split email and check domain
        const emailParts = value.split('@');
        
        // Ensure email has both local and domain parts
        if (emailParts.length !== 2) return false;
        
        const emailDomain = emailParts[1].toLowerCase();
        return !DISPOSABLE_DOMAINS.includes(emailDomain);
      })
      .required(t('register.errors.emailRequired')),
    
    password: Yup.string()
      .min(8, t('register.passwordRequirements.length'))
      .matches(/[A-Z]/, t('register.passwordRequirements.uppercase'))
      .matches(/[a-z]/, t('register.passwordRequirements.lowercase'))
      .matches(/[0-9]/, t('register.passwordRequirements.number'))
      .matches(/[@$!%*?&]/, t('register.passwordRequirements.specialChar'))
      .required(t('register.errors.passwordRequired')),
    
    confirmPassword: Yup.string()
      .oneOf([Yup.ref('password'), null], t('register.errors.passwordMismatch'))
      .required(t('register.errors.confirmPasswordRequired')),
    
    fullName: Yup.string()
      .required(t('register.errors.fullNameRequired')),
    
    offshoreRole: Yup.string()
      .required(t('register.errors.offshoreRoleRequired')),
    
    country: Yup.array()
      .of(Yup.string())
      .min(1, t('register.errors.countryRequired')),
    
    workingRegime: Yup.string()
      .required(t('register.errors.workingRegimeRequired')),
    
    customOnDutyDays: Yup.number()
      .min(7, t('register.errors.minimumWorkingDays'))
      .max(365, t('register.errors.maximumWorkingDays')),
    
    customOffDutyDays: Yup.number()
      .min(7, t('register.errors.minimumWorkingDays'))
      .max(365, t('register.errors.maximumWorkingDays')),
    
    company: Yup.string(),
    
    unitName: Yup.string(),
  });

  const handleSubmit = async (values, { setSubmitting, setErrors }) => {
    try {
      // Prepare data for submission
      const submissionData = {
        ...values,
        // Convert country from [code, name] to just the code
        country: values.country[0],
        
        // Add current language to submission data
        language: i18n.language.split('-')[0], // Normalize language code
        
        // Handle working regime validation
        ...(values.workingRegime === 'custom' 
          ? {
              customWorkingRegime: {
                onDutyDays: parseInt(values.customOnDutyDays, 10),
                offDutyDays: parseInt(values.customOffDutyDays, 10)
              }
            } 
          : { workingRegime: values.workingRegime }
        )
      };

      // Remove unnecessary fields
      delete submissionData.customOnDutyDays;
      delete submissionData.customOffDutyDays;

      // Validate total working days for custom regime
      if (values.workingRegime === 'custom') {
        const totalDays = parseInt(values.customOnDutyDays, 10) + 
                          parseInt(values.customOffDutyDays, 10);
        
        if (totalDays > 365) {
          setErrors({
            customOnDutyDays: t('register.errors.maximumWorkingDays'),
            customOffDutyDays: t('register.errors.maximumWorkingDays')
          });
          setSubmitting(false);
          return;
        }
      }

      // Send registration request
      const response = await api.post('/api/auth/register', submissionData);

      // Show success message
      const successMessage = t('register.verificationMessage');
      
      // Show snackbar with verification message
      setSnackbarMessage(successMessage);
      setSnackbarOpen(true);
      
      // After a short delay, redirect to login page
      setTimeout(() => {
        navigate('/login', { 
          state: { 
            successMessage: successMessage,
            showVerificationAlert: true
          } 
        });
      }, 2000);
    } catch (error) {
      // Handle registration errors
      console.error('Registration error:', error);
      
      if (error.response) {
        const serverErrors = error.response.data.errors || 
                             error.response.data.missingFields || 
                             {};
        
        // Map server errors to form errors
        const formErrors = {};
        Object.keys(serverErrors).forEach(key => {
          formErrors[key] = serverErrors[key];
        });

        setErrors(formErrors);
      } else {
        // Generic error handling
        setErrors({
          submit: t('register.errors.registrationFailed')
        });
      }

      setSubmitting(false);
    }
  };

  // Check for Google login data
  useEffect(() => {
    const googleData = location.state?.googleUserData;
    if (googleData) {
      setGoogleUserData(googleData);
      setIsGoogleLogin(true);
    }
  }, [location.state]);

  // Registration lock status check
  const checkRegistrationLock = () => {
    const lockExpiryTime = getCookie('registrationLockExpiry');
    const currentTime = Date.now();

    if (lockExpiryTime && parseInt(lockExpiryTime, 10) > currentTime) {
      setIsLocked(true);
      setLockExpiry(parseInt(lockExpiryTime, 10));
      return true;
    }
    
    removeCookie('registrationLockExpiry');
    setIsLocked(false);
    setLockExpiry(null);
    return false;
  };

  useEffect(() => {
    checkRegistrationLock();
    const intervalId = setInterval(checkRegistrationLock, 60000); // Check every minute

    return () => clearInterval(intervalId);
  }, []);

  const setRegistrationLockExpiry = (lockDuration) => {
    const lockExpiryTime = Date.now() + lockDuration;
    setCookie('registrationLockExpiry', lockExpiryTime.toString(), { 
      path: '/', 
      maxAge: Math.floor(lockDuration / 1000) 
    });
  };

  // Language-based country name update
  const updateCountryName = (currentCountry) => {
    if (currentCountry[0]) {
      // Find the country object by its current code
      const countryObj = OFFSHORE_COUNTRIES.find(c => c.code === currentCountry[0]);

      if (countryObj) {
        const translatedCountryName = t(`countries.${countryObj.code}`);
        
        // Only update if the translated name is different from the current name
        if (translatedCountryName.toLowerCase() !== currentCountry[1].toLowerCase()) {
          return [currentCountry[0], translatedCountryName];
        }
      }
    }
    return currentCountry;
  };

  return (
    <Container component="main" maxWidth="sm">
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={2000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      />
      <Paper elevation={2} sx={{ p: 4, mt: 4, mb: 4, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', borderRadius: 2, bgcolor: 'background.paper' }}>
        <Typography 
          component="h1" 
          variant="h5" 
          sx={{ 
            mb: 3,
            fontWeight: 600,
            color: 'primary.main'
          }}
        >
          {isGoogleLogin ? t('register.completeProfile') : t('register.title')}
        </Typography>

        <Formik
          initialValues={{
            username: googleUserData?.email.split('@')[0] || '',
            email: googleUserData?.email || '',
            password: '',
            confirmPassword: '',
            fullName: googleUserData?.name || '',
            offshoreRole: '',
            workingRegime: '28/28', // Default to 28/28
            customOnDutyDays: '',
            customOffDutyDays: '',
            company: '',
            unitName: '',
            country: ['', ''] // Store as [countryCode, countryName]
          }}
          validationSchema={PasswordValidationSchema}
          onSubmit={handleSubmit}
        >
          {(formikProps) => {
            const { 
              values, 
              errors, 
              touched, 
              isSubmitting, 
              handleChange, 
              handleBlur, 
              setFieldValue 
            } = formikProps;

            return (
              <Form>
                <Box sx={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: 2 // Adds consistent 16px spacing between form elements
                }}>
                  {isLocked && (
                    <Alert severity="error">
                      {t('register.errors.tooManyAttempts', { minutes: Math.ceil((lockExpiry - Date.now()) / 60000) })}
                    </Alert>
                  )}

                  <TextField
                    fullWidth
                    name="username"
                    label={t('register.username')}
                    value={values.username}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={touched.username && Boolean(errors.username)}
                    helperText={touched.username && errors.username}
                    disabled={isGoogleLogin}
                  />

                  <TextField
                    fullWidth
                    name="email"
                    label={t('register.emailAddress')}
                    value={values.email}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={touched.email && Boolean(errors.email)}
                    helperText={touched.email && errors.email}
                    disabled={isGoogleLogin}
                  />
                  
                  <TextField
                    fullWidth
                    name="fullName"
                    label={t('register.fullName')}
                    value={values.fullName}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={touched.fullName && Boolean(errors.fullName)}
                    helperText={touched.fullName && errors.fullName}
                    disabled={isGoogleLogin}
                  />
                  
                  <FormControl fullWidth>
                    <InputLabel>{t('register.offshoreRole')}</InputLabel>
                    <Select
                      name="offshoreRole"
                      value={values.offshoreRole}
                      label={t('register.offshoreRole')}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={touched.offshoreRole && Boolean(errors.offshoreRole)}
                    >
                      {getTranslatedRoles().map((role, index) => (
                        <MenuItem key={OFFSHORE_ROLES[index]} value={OFFSHORE_ROLES[index]}>
                          {role}
                        </MenuItem>
                      ))}
                    </Select>
                    {touched.offshoreRole && errors.offshoreRole && (
                      <FormHelperText error>{errors.offshoreRole}</FormHelperText>
                    )}
                  </FormControl>
                  
                  <FormControl fullWidth>
                    <InputLabel>{t('register.workingRegime')}</InputLabel>
                    <Select
                      name="workingRegime"
                      value={values.workingRegime}
                      label={t('register.workingRegime')}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={touched.workingRegime && Boolean(errors.workingRegime)}
                    >
                      <MenuItem value="7/7">7/7</MenuItem>
                      <MenuItem value="14/14">14/14</MenuItem>
                      <MenuItem value="28/28">28/28</MenuItem>
                      <MenuItem value="custom">{t('register.customRegime')}</MenuItem>
                    </Select>
                    {touched.workingRegime && errors.workingRegime && (
                      <FormHelperText error>{errors.workingRegime}</FormHelperText>
                    )}
                  </FormControl>
                  
                  {values.workingRegime === 'custom' && (
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <TextField
                        fullWidth
                        type="number"
                        label={t('register.customOnDutyDays')}
                        name="customOnDutyDays"
                        value={values.customOnDutyDays}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        inputProps={{ min: 7, max: 365 }}
                        error={touched.customOnDutyDays && Boolean(errors.customOnDutyDays)}
                        helperText={touched.customOnDutyDays && errors.customOnDutyDays}
                      />
                      <TextField
                        fullWidth
                        type="number"
                        label={t('register.customOffDutyDays')}
                        name="customOffDutyDays"
                        value={values.customOffDutyDays}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        inputProps={{ min: 7, max: 365 }}
                        error={touched.customOffDutyDays && Boolean(errors.customOffDutyDays)}
                        helperText={touched.customOffDutyDays && errors.customOffDutyDays}
                      />
                    </Box>
                  )}
                  
                  <TextField
                    fullWidth
                    label={t('register.company')}
                    name="company"
                    value={values.company}
                    onChange={handleChange}
                    onBlur={handleBlur}
                  />
                  <TextField
                    fullWidth
                    label={t('register.unitName')}
                    name="unitName"
                    value={values.unitName}
                    onChange={handleChange}
                    onBlur={handleBlur}
                  />
                  <FormControl fullWidth>
                    <InputLabel>{t('register.country')}</InputLabel>
                    <Select
                      name="country"
                      value={values.country[1]} // Use country name for display
                      label={t('register.country')}
                      onChange={(e) => {
                        // Find the corresponding country object
                        const selectedCountry = getTranslatedCountries().find(c => 
                          t(`countries.${c.code}`) === e.target.value
                        );
                        
                        if (selectedCountry) {
                          const updatedCountry = updateCountryName([
                            selectedCountry.code, 
                            t(`countries.${selectedCountry.code}`)
                          ]);
                          setFieldValue('country', updatedCountry);
                        }
                      }}
                      onBlur={handleBlur}
                      error={touched.country && Boolean(errors.country)}
                    >
                      <MenuItem value="">Select Country</MenuItem>
                      {getTranslatedCountries().map(country => (
                        <MenuItem key={country.code} value={t(`countries.${country.code}`)}>
                          {t(`countries.${country.code}`)}
                        </MenuItem>
                      ))}
                    </Select>
                    {touched.country && errors.country && (
                      <FormHelperText error>{errors.country}</FormHelperText>
                    )}
                  </FormControl>
                  
                  <TextField
                    fullWidth
                    type={showPassword ? 'text' : 'password'}
                    label={t('register.password')}
                    name="password"
                    value={values.password}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={touched.password && Boolean(errors.password)}
                    helperText={touched.password && errors.password}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            aria-label="toggle password visibility"
                            onClick={handleClickShowPassword}
                            onMouseDown={handleMouseDownPassword}
                            edge="end"
                          >
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      )
                    }}
                  />
                  <TextField
                    fullWidth
                    type={showConfirmPassword ? 'text' : 'password'}
                    label={t('register.confirmPassword')}
                    name="confirmPassword"
                    value={values.confirmPassword}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={touched.confirmPassword && Boolean(errors.confirmPassword)}
                    helperText={touched.confirmPassword && errors.confirmPassword}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            aria-label="toggle confirm password visibility"
                            onClick={handleClickShowConfirmPassword}
                            onMouseDown={handleMouseDownPassword}
                            edge="end"
                          >
                            {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      )
                    }}
                  />
                  
                  <Button 
                    type="submit" 
                    variant="contained" 
                    color="primary" 
                    disabled={isSubmitting || isLocked}
                    fullWidth
                  >
                    {isGoogleLogin ? t('register.completeProfileButton') : t('register.registerButton')}
                  </Button>
                </Box>
              </Form>
            );
          }}
        </Formik>

        <Typography variant="body2" align="center" sx={{ mt: 2 }}>
          {t('register.alreadyHaveAccount')}{' '}
          <Link to="/login">{t('register.loginLink')}</Link>
        </Typography>
      </Paper>
    </Container>
  );
};

export default Register;

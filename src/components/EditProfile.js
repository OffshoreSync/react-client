import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api, getCookie, setCookie } from '../utils/apiUtils';
import { useNavigate } from 'react-router-dom';
import { 
  TextField, 
  Button, 
  Select, 
  MenuItem, 
  FormControl, 
  InputLabel, 
  Grid, 
  Typography, 
  Container, 
  Alert,
  Box,
  Paper
} from '@mui/material';

import { OFFSHORE_COUNTRIES, getTranslatedCountries } from '../utils/countries';
import { OFFSHORE_ROLES, getTranslatedRoles } from '../utils/offshoreRoles';

const EditProfile = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    email: '',
    offshoreRole: '',
    workingRegime: '28/28', // Default to 28/28
    customOnDutyDays: '',
    customOffDutyDays: '',
    country: ['', ''], // Will store [countryCode, countryName]
    company: '',
    unitName: ''
  });

  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const response = await api.get('/api/auth/profile');

        const { user } = response.data;
        
        // Find the country name for the fetched country code
        const countryObj = OFFSHORE_COUNTRIES.find(c => c.code === user.country);
        const countryName = countryObj ? t(`countries.${user.country}`) : user.country;

        // Handle working regime conversion
        let workingRegimeDisplay = '28/28'; // Default
        let customOnDutyDays = '';
        let customOffDutyDays = '';

        if (user.workingRegime) {
          const predefinedRegimes = {
            '7/7': { onDutyDays: 7, offDutyDays: 7 },
            '14/14': { onDutyDays: 14, offDutyDays: 14 },
            '28/28': { onDutyDays: 28, offDutyDays: 28 }
          };

          // Check if it matches a predefined regime
          const matchedPredefined = Object.entries(predefinedRegimes).find(
            ([key, regime]) => 
              regime.onDutyDays === user.workingRegime.onDutyDays && 
              regime.offDutyDays === user.workingRegime.offDutyDays
          );

          if (matchedPredefined) {
            workingRegimeDisplay = matchedPredefined[0];
          } else {
            // Custom regime
            workingRegimeDisplay = 'custom';
            customOnDutyDays = user.workingRegime.onDutyDays.toString();
            customOffDutyDays = user.workingRegime.offDutyDays.toString();
          }
        }

        setFormData({
          fullName: user.fullName || '',
          username: user.username || '',
          email: user.email || '',
          offshoreRole: user.offshoreRole || '',
          workingRegime: workingRegimeDisplay,
          customOnDutyDays: customOnDutyDays,
          customOffDutyDays: customOffDutyDays,
          country: [user.country, countryName], // Store as [code, translated name]
          company: user.company || '',
          unitName: user.unitName || ''
        });
      } catch (error) {
        console.error('Profile fetch error:', error);
        navigate('/login');
      }
    };

    fetchUserProfile();
  }, []);

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

  const validateForm = () => {
    const newErrors = {};

    if (!formData.fullName) newErrors.fullName = t('register.errors.requiredField');
    if (!formData.username) newErrors.username = t('register.errors.requiredField');
    if (!formData.email) newErrors.email = t('register.errors.requiredField');
    if (!formData.offshoreRole) newErrors.offshoreRole = t('register.errors.requiredField');
    if (!formData.country[0]) newErrors.country = t('register.errors.requiredField');

    if (formData.workingRegime === 'custom') {
      const onDutyDays = parseInt(formData.customOnDutyDays, 10);
      const offDutyDays = parseInt(formData.customOffDutyDays, 10);

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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
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
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      // Determine working regime
      let finalWorkingRegime;
      if (formData.workingRegime === 'custom') {
        const onDutyDays = parseInt(formData.customOnDutyDays, 10);
        const offDutyDays = parseInt(formData.customOffDutyDays, 10);

        // Validate custom working regime
        if (isNaN(onDutyDays) || isNaN(offDutyDays)) {
          setErrors({ customWorkingRegime: t('register.errors.invalidWorkingRegime') });
          return;
        }

        if (onDutyDays < 7 || offDutyDays < 7) {
          setErrors({ customWorkingRegime: t('register.errors.minimumWorkingDays') });
          return;
        }

        if (onDutyDays + offDutyDays > 365) {
          setErrors({ customWorkingRegime: t('register.errors.maximumWorkingDays') });
          return;
        }

        finalWorkingRegime = { 
          onDutyDays, 
          offDutyDays 
        };
      } else {
        // Predefined regimes
        const [onDutyDays, offDutyDays] = formData.workingRegime.split('/').map(Number);
        finalWorkingRegime = { 
          onDutyDays, 
          offDutyDays 
        };
      }

      // Prepare data for submission
      const submitData = {
        ...formData,
        workingRegime: finalWorkingRegime,
        company: formData.company.trim() || null,
        unitName: formData.unitName.trim() || null,
        country: formData.country[0] // Use country code for submission
      };

      // Remove custom working regime inputs from submitted data
      delete submitData.customOnDutyDays;
      delete submitData.customOffDutyDays;

      const response = await api.put('/api/auth/update-profile', submitData);

      // Update user cookie with new data
      const { user } = response.data;
      setCookie('user', user);

      setSuccessMessage(t('register.profileUpdateSuccess'));
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (error) {
      console.error('Error updating profile:', error);
      setErrors({ submit: t('register.errors.registrationFailed') });
    }
  };

  const translatedCountries = getTranslatedCountries();
  const translatedRoles = getTranslatedRoles();

  return (
    <Container maxWidth="md">
      <Box
        sx={{
          marginTop: 4,
          marginBottom: 4,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper
          elevation={2}
          sx={{
            p: 4,
            width: '100%',
            borderRadius: 2,
            bgcolor: 'background.paper'
          }}
        >
          <Typography 
            component="h1" 
            variant="h5" 
            sx={{ 
              mb: 4,
              fontWeight: 600,
              color: 'primary.main',
              textAlign: 'center'
            }}
          >
            {t('settings.editProfile')}
          </Typography>

          {successMessage && (
            <Alert severity="success" sx={{ mb: 3 }}>
              {successMessage}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label={t('register.fullName')}
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  error={!!errors.fullName}
                  helperText={errors.fullName}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label={t('register.username')}
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  error={!!errors.username}
                  helperText={errors.username}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label={t('register.emailAddress')}
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  error={!!errors.email}
                  helperText={errors.email}
                />
              </Grid>

              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>{t('register.offshoreRole')}</InputLabel>
                  <Select
                    name="offshoreRole"
                    value={formData.offshoreRole}
                    label={t('register.offshoreRole')}
                    onChange={handleChange}
                    error={!!errors.offshoreRole}
                  >
                    {OFFSHORE_ROLES.map((role, index) => (
                      <MenuItem key={role} value={role}>
                        {translatedRoles[index]}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>{t('register.workingRegime')}</InputLabel>
                  <Select
                    name="workingRegime"
                    value={formData.workingRegime}
                    label={t('register.workingRegime')}
                    onChange={handleChange}
                  >
                    <MenuItem value="7/7">7/7</MenuItem>
                    <MenuItem value="14/14">14/14</MenuItem>
                    <MenuItem value="28/28">28/28</MenuItem>
                    <MenuItem value="custom">{t('register.customRegime')}</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {formData.workingRegime === 'custom' && (
                <>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label={t('register.customOnDutyDays')}
                      name="customOnDutyDays"
                      type="number"
                      value={formData.customOnDutyDays}
                      onChange={handleChange}
                      error={!!errors.customWorkingRegime}
                      helperText={errors.customWorkingRegime}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label={t('register.customOffDutyDays')}
                      name="customOffDutyDays"
                      type="number"
                      value={formData.customOffDutyDays}
                      onChange={handleChange}
                      error={!!errors.customWorkingRegime}
                      helperText={errors.customWorkingRegime}
                    />
                  </Grid>
                </>
              )}

              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>{t('register.country')}</InputLabel>
                  <Select
                    name="country"
                    value={formData.country[1]} // Use country name for display
                    label={t('register.country')}
                    onChange={(e) => {
                      // Find the corresponding country object
                      const selectedCountry = translatedCountries.find(c => 
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
                    {translatedCountries.map(country => (
                      <MenuItem key={country.code} value={t(`countries.${country.code}`)}>
                        {t(`countries.${country.code}`)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label={t('register.company')}
                  name="company"
                  value={formData.company}
                  onChange={handleChange}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label={t('register.unitName')}
                  name="unitName"
                  value={formData.unitName}
                  onChange={handleChange}
                />
              </Grid>

              {errors.submit && (
                <Grid item xs={12}>
                  <Alert severity="error">{errors.submit}</Alert>
                </Grid>
              )}

              <Grid item xs={12}>
                <Button 
                  type="submit" 
                  variant="contained" 
                  color="primary" 
                  fullWidth
                >
                  {t('common.save')}
                </Button>
              </Grid>
            </Grid>
          </form>
        </Paper>
      </Box>
    </Container>
  );
};

export default EditProfile;

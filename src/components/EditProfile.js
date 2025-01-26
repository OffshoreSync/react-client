import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { OFFSHORE_COUNTRIES } from '../utils/countries';

const EditProfile = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    fullName: '',
    offshoreRole: '',
    workingRegime: '28/28', // Default to 28/28
    customOnDutyDays: '',
    customOffDutyDays: '',
    company: '',
    unitName: '',
    country: ''
  });
  const [originalUser, setOriginalUser] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();
  const [countryList] = useState(OFFSHORE_COUNTRIES.map(country => country.name));

  const handleWorkingRegimeChange = (e) => {
    const { name, value } = e.target;
    
    // If changing working regime dropdown
    if (name === 'workingRegime') {
      setFormData(prevState => ({
        ...prevState,
        workingRegime: value,
        // Reset custom days when changing regime
        customOnDutyDays: value === 'custom' ? '' : '',
        customOffDutyDays: value === 'custom' ? '' : ''
      }));
    } 
    // If changing custom days
    else if (name === 'customOnDutyDays' || name === 'customOffDutyDays') {
      setFormData(prevState => ({
        ...prevState,
        [name]: value,
        // Ensure working regime is set to custom when editing custom days
        workingRegime: 'custom'
      }));
    }
  };

  const onChange = e => {
    const { name, value } = e.target;
    if (name === 'workingRegime' || name === 'customOnDutyDays' || name === 'customOffDutyDays') {
      handleWorkingRegimeChange(e);
    } else {
      setFormData(prevState => ({ ...prevState, [name]: value }));
    }
    setError(''); // Clear error when user starts typing
    setSuccess(''); // Clear success message
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      // Prepare data for submission
      const updateData = {
        username: formData.username,
        email: formData.email,
        fullName: formData.fullName,
        offshoreRole: formData.offshoreRole,
        company: formData.company || null,
        
        // Explicitly include country and unitName
        country: formData.country || originalUser.country,
        unitName: formData.unitName || originalUser.unitName,
      };

      // Handle working regime
      if (formData.workingRegime === 'custom') {
        // Validate custom regime
        const onDutyDays = parseInt(formData.customOnDutyDays);
        const offDutyDays = parseInt(formData.customOffDutyDays);

        if (isNaN(onDutyDays) || isNaN(offDutyDays)) {
          setError('Please enter valid custom working days');
          return;
        }

        if (onDutyDays < 7 || onDutyDays > 365 || offDutyDays < 7 || offDutyDays > 365) {
          setError('Custom working days must be between 7 and 365');
          return;
        }

        updateData.workingRegime = {
          onDutyDays,
          offDutyDays
        };
      } else {
        // For predefined regimes
        const [onDutyDays, offDutyDays] = formData.workingRegime.split('/').map(Number);
        updateData.workingRegime = { onDutyDays, offDutyDays };
      }

      // Get token from localStorage
      const token = localStorage.getItem('token');

      console.log('Sending update data:', updateData);

      // Send update request
      const response = await axios.put(
        'http://localhost:5000/api/auth/update-profile', 
        updateData, 
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log('Update response:', response.data);

      // Update localStorage with new user data
      const safeUser = {
        id: response.data.user.id,
        username: response.data.user.username,
        email: response.data.user.email,
        fullName: response.data.user.fullName,
        offshoreRole: response.data.user.offshoreRole,
        workingRegime: response.data.user.workingRegime,
        company: response.data.user.company || null,
        workSchedule: response.data.user.workSchedule || {
          nextOnBoardDate: null,
          nextOffBoardDate: null
        },
        unitName: response.data.user.unitName || null,
        country: response.data.user.country || null,
        profilePicture: response.data.user.profilePicture || null,
        coverPicture: response.data.user.coverPicture || null,
        followers: response.data.user.followers || [],
        following: response.data.user.following || []
      };

      localStorage.setItem('user', JSON.stringify(safeUser));

      // Update token
      localStorage.setItem('token', response.data.token);

      // Show success message
      setSuccess('Profile updated successfully');

      // Optional: Redirect or update state
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    } catch (err) {
      console.error('Profile update error:', err.response?.data || err.message);
      setError(err.response?.data?.message || 'Profile update failed. Please try again.');
    }
  };

  useEffect(() => {
    // Check if user is logged in
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');

    if (!storedUser || !token) {
      // Redirect to login if no user or token
      navigate('/login');
      return;
    }

    // Parse and set user
    try {
      const parsedUser = JSON.parse(storedUser);
      setOriginalUser(parsedUser);
      
      // Populate form with existing user data
      const workingRegime = parsedUser.workingRegime;
      let workingRegimeDisplay = '28/28'; // Default
      let customOnDutyDays = '';
      let customOffDutyDays = '';

      // Determine working regime display
      if (workingRegime) {
        const predefinedRegimes = {
          '7/7': { onDutyDays: 7, offDutyDays: 7 },
          '14/14': { onDutyDays: 14, offDutyDays: 14 },
          '28/28': { onDutyDays: 28, offDutyDays: 28 }
        };

        const matchedPredefined = Object.entries(predefinedRegimes).find(
          ([, value]) => value.onDutyDays === workingRegime.onDutyDays && 
                         value.offDutyDays === workingRegime.offDutyDays
        );

        if (matchedPredefined) {
          workingRegimeDisplay = matchedPredefined[0];
        } else {
          // Custom regime
          workingRegimeDisplay = 'custom';
          customOnDutyDays = workingRegime.onDutyDays;
          customOffDutyDays = workingRegime.offDutyDays;
        }
      }

      setFormData({
        username: parsedUser.username || '',
        email: parsedUser.email || '',
        fullName: parsedUser.fullName || '',
        offshoreRole: parsedUser.offshoreRole || '',
        workingRegime: workingRegimeDisplay,
        customOnDutyDays: customOnDutyDays,
        customOffDutyDays: customOffDutyDays,
        company: parsedUser.company || '',
        
        // Explicitly handle country and unitName
        unitName: parsedUser.unitName || '',
        country: parsedUser.country || ''
      });

      console.log('Initial form data:', {
        unitName: parsedUser.unitName,
        country: parsedUser.country,
        workingRegime: workingRegimeDisplay,
        customOnDutyDays,
        customOffDutyDays
      });
    } catch (error) {
      console.error('Error parsing user data', error);
      // Clear invalid localStorage and redirect
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      navigate('/login');
    }
  }, [navigate]);

  if (!originalUser) return null;

  return (
    <Container maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Typography component="h1" variant="h5">
          Edit Profile
        </Typography>
        <Paper 
          elevation={3} 
          sx={{ 
            width: '100%', 
            padding: 3, 
            marginTop: 2,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <Box component="form" onSubmit={onSubmit} noValidate sx={{ mt: 1, width: '100%' }}>
            <TextField
              fullWidth
              label="Username"
              name="username"
              value={formData.username}
              onChange={onChange}
              required
              variant="outlined"
              sx={{ mb: 2 }}
            />
            
            <TextField
              fullWidth
              type="email"
              label="Email Address"
              name="email"
              value={formData.email}
              onChange={onChange}
              required
              variant="outlined"
              sx={{ mb: 2 }}
            />
            
            <TextField
              fullWidth
              label="Full Name"
              name="fullName"
              value={formData.fullName}
              onChange={onChange}
              required
              variant="outlined"
              sx={{ mb: 2 }}
            />
            
            <FormControl fullWidth required sx={{ mb: 2 }}>
              <InputLabel>Offshore Role</InputLabel>
              <Select
                name="offshoreRole"
                value={formData.offshoreRole}
                label="Offshore Role"
                onChange={onChange}
              >
                <MenuItem value="Drilling">Drilling</MenuItem>
                <MenuItem value="Production">Production</MenuItem>
                <MenuItem value="Maintenance">Maintenance</MenuItem>
                <MenuItem value="Support">Support</MenuItem>
                <MenuItem value="Management">Management</MenuItem>
              </Select>
            </FormControl>
            
            <FormControl fullWidth required sx={{ mb: 2 }}>
              <InputLabel>Working Regime</InputLabel>
              <Select
                name="workingRegime"
                value={formData.workingRegime}
                label="Working Regime"
                onChange={handleWorkingRegimeChange}
              >
                <MenuItem value="7/7">7 Days On / 7 Days Off</MenuItem>
                <MenuItem value="14/14">14 Days On / 14 Days Off</MenuItem>
                <MenuItem value="28/28">28 Days On / 28 Days Off</MenuItem>
                <MenuItem value="custom">Custom Regime</MenuItem>
              </Select>
            </FormControl>
            
            {formData.workingRegime === 'custom' && (
              <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <TextField
                  fullWidth
                  type="number"
                  label="On Duty Days (7-365)"
                  name="customOnDutyDays"
                  value={formData.customOnDutyDays}
                  onChange={handleWorkingRegimeChange}
                  inputProps={{ min: 7, max: 365 }}
                  required
                  variant="outlined"
                />
                <TextField
                  fullWidth
                  type="number"
                  label="Off Duty Days (7-365)"
                  name="customOffDutyDays"
                  value={formData.customOffDutyDays}
                  onChange={handleWorkingRegimeChange}
                  inputProps={{ min: 7, max: 365 }}
                  required
                  variant="outlined"
                />
              </Box>
            )}
            
            <TextField
              fullWidth
              label="Company (Optional)"
              name="company"
              value={formData.company}
              onChange={onChange}
              variant="outlined"
              sx={{ mb: 2 }}
            />
            
            <TextField
              fullWidth
              label="Unit Name (Optional)"
              name="unitName"
              value={formData.unitName}
              onChange={onChange}
              variant="outlined"
              sx={{ mb: 2 }}
            />
            
            <FormControl fullWidth required sx={{ mb: 2 }}>
              <InputLabel>Country</InputLabel>
              <Select
                name="country"
                value={formData.country}
                label="Country"
                onChange={onChange}
              >
                {countryList.map((country, index) => (
                  <MenuItem key={index} value={country}>
                    {country}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            {error && (
              <Alert severity="error" sx={{ width: '100%', mt: 2 }}>
                {error}
              </Alert>
            )}
            
            {success && (
              <Alert severity="success" sx={{ width: '100%', mt: 2 }}>
                {success}
              </Alert>
            )}
            
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
            >
              Update Profile
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default EditProfile;

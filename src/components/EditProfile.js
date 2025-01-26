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
      setFormData({
        username: parsedUser.username || '',
        email: parsedUser.email || '',
        fullName: parsedUser.fullName || '',
        offshoreRole: parsedUser.offshoreRole || '',
        workingRegime: parsedUser.workingRegime?.onDutyDays && parsedUser.workingRegime?.offDutyDays 
          ? `${parsedUser.workingRegime.onDutyDays}/${parsedUser.workingRegime.offDutyDays}` 
          : '28/28',
        customOnDutyDays: parsedUser.workingRegime?.onDutyDays || '',
        customOffDutyDays: parsedUser.workingRegime?.offDutyDays || '',
        company: parsedUser.company || '',
        unitName: parsedUser.unitName || '',
        country: parsedUser.country || ''
      });
    } catch (error) {
      console.error('Error parsing user data', error);
      // Clear invalid localStorage and redirect
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      navigate('/login');
    }
  }, [navigate]);

  const onChange = e => {
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
    setSuccess(''); // Clear success message
  };

  const onSubmit = async e => {
    e.preventDefault();
    try {
      // Determine working regime
      let finalWorkingRegime;
      if (formData.workingRegime === 'custom') {
        const onDutyDays = parseInt(formData.customOnDutyDays, 10);
        const offDutyDays = parseInt(formData.customOffDutyDays, 10);

        // Validate custom working regime
        if (isNaN(onDutyDays) || isNaN(offDutyDays)) {
          setError('Please enter valid numbers for On and Off Duty days');
          return;
        }

        if (onDutyDays < 7 || offDutyDays < 7) {
          setError('On and Off Duty days must be at least 7');
          return;
        }

        if (onDutyDays + offDutyDays > 365) {
          setError('Total On and Off Duty days must not exceed 365');
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

      // Prepare submit data
      const submitData = {
        ...formData,
        workingRegime: finalWorkingRegime,
        company: formData.company.trim() || null,
        unitName: formData.unitName.trim() || null
      };

      // Remove custom working regime inputs from submitted data
      delete submitData.customOnDutyDays;
      delete submitData.customOffDutyDays;

      // Get token for authorization
      const token = localStorage.getItem('token');
      
      // Send update request
      const res = await axios.put('http://localhost:5000/api/auth/update-profile', submitData, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      // Update local storage with new user data
      localStorage.setItem('user', JSON.stringify(res.data.user));

      // Set success message
      setSuccess('Profile updated successfully');

      // Optional: Redirect to profile settings after update
      setTimeout(() => {
        navigate('/settings');
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Profile update failed. Please try again.');
    }
  };

  if (!originalUser) return null;

  return (
    <Container maxWidth="sm">
      <Paper elevation={3} sx={{ p: 4, mt: 4 }}>
        <Typography variant="h4" gutterBottom align="center">
          Edit Profile
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        <Box component="form" onSubmit={onSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            fullWidth
            label="Username"
            name="username"
            value={formData.username}
            onChange={onChange}
            required
            variant="outlined"
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
          />
          
          <TextField
            fullWidth
            label="Full Name"
            name="fullName"
            value={formData.fullName}
            onChange={onChange}
            required
            variant="outlined"
          />
          
          <FormControl fullWidth required>
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
          
          <FormControl fullWidth required>
            <InputLabel>Working Regime</InputLabel>
            <Select
              name="workingRegime"
              value={formData.workingRegime}
              label="Working Regime"
              onChange={onChange}
            >
              <MenuItem value="7/7">7 Days On / 7 Days Off</MenuItem>
              <MenuItem value="14/14">14 Days On / 14 Days Off</MenuItem>
              <MenuItem value="28/28">28 Days On / 28 Days Off</MenuItem>
              <MenuItem value="custom">Custom Regime</MenuItem>
            </Select>
          </FormControl>
          
          {formData.workingRegime === 'custom' && (
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                type="number"
                label="On Duty Days (7-365)"
                name="customOnDutyDays"
                value={formData.customOnDutyDays}
                onChange={onChange}
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
                onChange={onChange}
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
          />
          
          <TextField
            fullWidth
            label="Unit Name (Optional)"
            name="unitName"
            value={formData.unitName}
            onChange={onChange}
            variant="outlined"
          />
          
          <FormControl fullWidth required>
            <InputLabel>Country</InputLabel>
            <Select
              name="country"
              value={formData.country}
              label="Country"
              onChange={onChange}
            >
              <MenuItem value="">Select Country</MenuItem>
              {OFFSHORE_COUNTRIES.map(country => (
                <MenuItem key={country.code} value={country.name}>
                  {country.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
            <Button 
              variant="outlined" 
              color="secondary"
              onClick={() => navigate('/settings')}
            >
              Cancel
            </Button>
            
            <Button 
              type="submit" 
              variant="contained" 
              color="primary" 
              size="large"
            >
              Update Profile
            </Button>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default EditProfile;

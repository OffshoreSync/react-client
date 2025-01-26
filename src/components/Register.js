import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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

const Register = () => {
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

      const res = await axios.post('http://localhost:5000/api/auth/register', submitData);
      
      // Store user token and info in localStorage
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));

      // Redirect to dashboard or main app page
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    }
  };

  return (
    <Container maxWidth="sm">
      <Paper elevation={3} sx={{ p: 4, mt: 4 }}>
        <Typography variant="h4" gutterBottom align="center">
          Offshore Worker Registration
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={onSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            fullWidth
            label="Username"
            name="username"
            value={username}
            onChange={onChange}
            required
            variant="outlined"
          />
          
          <TextField
            fullWidth
            type="email"
            label="Email Address"
            name="email"
            value={email}
            onChange={onChange}
            required
            variant="outlined"
          />
          
          <TextField
            fullWidth
            type="password"
            label="Password"
            name="password"
            value={password}
            onChange={onChange}
            required
            variant="outlined"
            inputProps={{ minLength: 6 }}
          />
          
          <TextField
            fullWidth
            label="Full Name"
            name="fullName"
            value={fullName}
            onChange={onChange}
            required
            variant="outlined"
          />
          
          <FormControl fullWidth required>
            <InputLabel>Offshore Role</InputLabel>
            <Select
              name="offshoreRole"
              value={offshoreRole}
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
              value={workingRegime}
              label="Working Regime"
              onChange={onChange}
            >
              <MenuItem value="7/7">7 Days On / 7 Days Off</MenuItem>
              <MenuItem value="14/14">14 Days On / 14 Days Off</MenuItem>
              <MenuItem value="28/28">28 Days On / 28 Days Off</MenuItem>
              <MenuItem value="custom">Custom Regime</MenuItem>
            </Select>
          </FormControl>
          
          {workingRegime === 'custom' && (
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                type="number"
                label="On Duty Days (7-365)"
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
                label="Off Duty Days (7-365)"
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
            label="Company (Optional)"
            name="company"
            value={company}
            onChange={onChange}
            variant="outlined"
          />
          <TextField
            fullWidth
            label="Unit Name (Optional)"
            name="unitName"
            value={unitName}
            onChange={onChange}
            variant="outlined"
          />
          <FormControl fullWidth required>
            <InputLabel>Country</InputLabel>
            <Select
              name="country"
              value={country}
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
          
          <Button 
            type="submit" 
            variant="contained" 
            color="primary" 
            size="large"
            sx={{ mt: 2 }}
          >
            Register
          </Button>
        </Box>

        <Typography variant="body2" align="center" sx={{ mt: 2 }}>
          Already have an account? <Link to="/login">Login</Link>
        </Typography>
      </Paper>
    </Container>
  );
}

export default Register;

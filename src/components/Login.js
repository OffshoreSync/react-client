import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { 
  Container, 
  Typography, 
  TextField, 
  Button, 
  Box, 
  Paper, 
  Link as MuiLink,
  Alert
} from '@mui/material';
import LoginIcon from '@mui/icons-material/Login';

const Login = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [error, setError] = useState('');

  const navigate = useNavigate();

  const { username, password } = formData;

  const onChange = e => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError(''); // Clear error when user starts typing
  };

  const onSubmit = async e => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:5000/api/auth/login', formData);
      
      console.log('Full login response:', res.data);
      
      // Ensure working regime is correctly stored
      const userWithFullData = {
        ...res.data.user,
        workingRegime: res.data.user.workingRegime || {
          onDutyDays: 28,  // Default to 28/28 if not present
          offDutyDays: 28
        }
      };
      
      console.log('Processed user data:', userWithFullData);
      
      // Validate working regime
      if (!userWithFullData.workingRegime || 
          typeof userWithFullData.workingRegime.onDutyDays !== 'number' ||
          typeof userWithFullData.workingRegime.offDutyDays !== 'number') {
        console.warn('Invalid working regime detected, using default');
        userWithFullData.workingRegime = {
          onDutyDays: 28,
          offDutyDays: 28
        };
      }
      
      // Store user token and info in localStorage
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(userWithFullData));

      // Redirect to dashboard or main app page
      navigate('/dashboard');
    } catch (err) {
      console.error('Login error:', err.response?.data || err.message);
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    }
  };

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
          Offshore Worker Login
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
          <Box component="form" onSubmit={onSubmit} noValidate sx={{ mt: 1 }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="username"
              label="Username"
              name="username"
              autoComplete="username"
              autoFocus
              value={username}
              onChange={onChange}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type="password"
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={onChange}
            />
            
            {error && (
              <Alert severity="error" sx={{ width: '100%', mt: 2 }}>
                {error}
              </Alert>
            )}
            
            <Button
              type="submit"
              fullWidth
              variant="contained"
              startIcon={<LoginIcon />}
              sx={{ mt: 3, mb: 2 }}
            >
              Sign In
            </Button>
            
            <Typography variant="body2" color="text.secondary" align="center">
              Don't have an account? 
              <MuiLink 
                component={Link} 
                to="/register" 
                sx={{ ml: 1 }}
              >
                Register here
              </MuiLink>
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default Login;

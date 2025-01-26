import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

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
        // Extensive logging and fallback
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
    <div className="login-container">
      <h2>Offshore Worker Login</h2>
      <form onSubmit={onSubmit}>
        <input
          type="text"
          placeholder="Username"
          name="username"
          value={username}
          onChange={onChange}
          required
        />
        <input
          type="password"
          placeholder="Password"
          name="password"
          value={password}
          onChange={onChange}
          required
        />
        {error && <p className="error-message">{error}</p>}
        <button type="submit">Login</button>
        
        <div className="register-prompt">
          <p>Don't have an account? 
            <Link to="/register"> Register here</Link>
          </p>
        </div>
      </form>
    </div>
  );
};

export default Login;

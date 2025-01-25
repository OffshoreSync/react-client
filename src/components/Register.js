import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

const Register = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    fullName: '',
    offshoreRole: ''
  });
  const [error, setError] = useState('');

  const navigate = useNavigate();

  const { username, email, password, fullName, offshoreRole } = formData;

  const onChange = e => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError(''); // Clear error when user starts typing
  };

  const onSubmit = async e => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:5000/api/auth/register', formData);
      
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
    <div className="register-container">
      <h2>Offshore Worker Registration</h2>
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
          type="email"
          placeholder="Email Address"
          name="email"
          value={email}
          onChange={onChange}
          required
        />
        <input
          type="password"
          placeholder="Password"
          name="password"
          value={password}
          onChange={onChange}
          minLength="6"
          required
        />
        <input
          type="text"
          placeholder="Full Name"
          name="fullName"
          value={fullName}
          onChange={onChange}
          required
        />
        <select
          name="offshoreRole"
          value={offshoreRole}
          onChange={onChange}
          required
        >
          <option value="">Select Offshore Role</option>
          <option value="Drilling">Drilling</option>
          <option value="Production">Production</option>
          <option value="Maintenance">Maintenance</option>
          <option value="Support">Support</option>
          <option value="Management">Management</option>
        </select>
        
        {error && <p className="error-message">{error}</p>}
        
        <button type="submit">Register</button>
        
        <div className="login-prompt">
          <p>Already have an account? 
            <Link to="/login"> Login here</Link>
          </p>
        </div>
      </form>
    </div>
  );
};

export default Register;

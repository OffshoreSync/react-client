import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
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
        
        <select
          name="workingRegime"
          value={workingRegime}
          onChange={onChange}
          required
        >
          <option value="7/7">7 Days On / 7 Days Off</option>
          <option value="14/14">14 Days On / 14 Days Off</option>
          <option value="28/28">28 Days On / 28 Days Off</option>
          <option value="custom">Custom Regime</option>
        </select>
        
        {workingRegime === 'custom' && (
          <div className="custom-regime-inputs">
            <input
              type="number"
              placeholder="On Duty Days (7-365)"
              name="customOnDutyDays"
              value={customOnDutyDays}
              onChange={onChange}
              min="7"
              max="365"
              required
            />
            <input
              type="number"
              placeholder="Off Duty Days (7-365)"
              name="customOffDutyDays"
              value={customOffDutyDays}
              onChange={onChange}
              min="7"
              max="365"
              required
            />
          </div>
        )}
        
        <input
          type="text"
          placeholder="Company (Optional)"
          name="company"
          value={company}
          onChange={onChange}
        />
        <input
          type="text"
          placeholder="Unit Name (Optional)"
          name="unitName"
          value={unitName}
          onChange={onChange}
        />
        <select
          name="country"
          value={country}
          onChange={onChange}
          required
        >
          <option value="">Select Country</option>
          {OFFSHORE_COUNTRIES.map(country => (
            <option key={country.code} value={country.name}>
              {country.name}
            </option>
          ))}
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

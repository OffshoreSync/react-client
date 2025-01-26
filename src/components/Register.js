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
    workingRegime: '',
    customWorkingRegime: '',
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
    customWorkingRegime,
    company, 
    unitName,
    country 
  } = formData;

  const onChange = e => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value,
      // Reset custom working regime if predefined option is selected
      ...(name === 'workingRegime' && value !== 'custom' 
        ? { customWorkingRegime: '' } 
        : {})
    }));
    setError(''); // Clear error when user starts typing
  };

  const onSubmit = async e => {
    e.preventDefault();
    try {
      // Determine the final working regime value
      const finalWorkingRegime = workingRegime === 'custom' 
        ? parseInt(customWorkingRegime, 10) 
        : parseInt(workingRegime, 10);

      // Validate custom working regime
      if (workingRegime === 'custom' && 
          (isNaN(finalWorkingRegime) || finalWorkingRegime < 29 || finalWorkingRegime > 365)) {
        setError('Custom working regime must be a number between 29 and 365');
        return;
      }

      // Remove empty strings for optional fields
      const submitData = {
        ...formData,
        workingRegime: finalWorkingRegime,
        company: company.trim() || null,
        unitName: unitName.trim() || null
      };

      // Remove custom working regime from submitted data
      delete submitData.customWorkingRegime;

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
          <option value="">Select Working Regime</option>
          <option value="7">7 Days</option>
          <option value="14">14 Days</option>
          <option value="28">28 Days</option>
          <option value="custom">Custom</option>
        </select>
        
        {workingRegime === 'custom' && (
          <input
            type="number"
            placeholder="Enter Custom Days (29-365)"
            name="customWorkingRegime"
            value={customWorkingRegime}
            onChange={onChange}
            min="29"
            max="365"
            required
          />
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

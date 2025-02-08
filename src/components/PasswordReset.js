import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import getBackendUrl from '../utils/apiUtils';

// Enhanced input validation functions
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

const PasswordReset = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const params = useParams();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [stage, setStage] = useState('request'); // 'request', 'check-email', 'reset'
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [passwordErrors, setPasswordErrors] = useState([]);

  useEffect(() => {
    // Check for token in URL query or route params
    const searchParams = new URLSearchParams(location.search);
    const urlToken = searchParams.get('token') || params.token;

    if (urlToken) {
      setResetToken(urlToken);
      setStage('reset');
    }
  }, [location.search, params.token]);

  useEffect(() => {
    if (params.token) {
      // Try to retrieve email from the previous password reset request
      const storedEmail = localStorage.getItem('resetEmail');
      if (storedEmail) {
        setEmail(storedEmail);
      }
    }
  }, [params.token]);

  const requestPasswordReset = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(
        getBackendUrl('/api/password/request-reset'), 
        { email }
      );
      setMessage(t('passwordReset.requestSent'));
      setStage('check-email');
      localStorage.setItem('resetEmail', email);
    } catch (error) {
      console.error('Password reset request error:', error);
      setError(
        error.response?.data?.message || 
        t('passwordReset.requestError')
      );
    }
  };

  const resetPassword = async (e) => {
    e.preventDefault();
    
    // Clear previous errors
    setPasswordErrors([]);
    setError('');

    // Attempt to retrieve email if not set
    const resetEmail = email || localStorage.getItem('resetEmail');

    // Log input details for debugging
    console.log('Password Reset Attempt:', {
      resetEmail,
      newPasswordLength: newPassword.length,
      confirmPasswordLength: confirmPassword.length,
      passwordsMatch: newPassword === confirmPassword,
      resetToken: resetToken ? 'Token Present' : 'No Token'
    });

    // Validate email
    if (!resetEmail) {
      setError(t('passwordReset.emailRequired'));
      return;
    }

    // Validate password
    if (!validatePassword(newPassword)) {
      const errors = [
        t('passwordReset.requirements.length'),
        t('passwordReset.requirements.uppercase'),
        t('passwordReset.requirements.lowercase'),
        t('passwordReset.requirements.number'),
        t('passwordReset.requirements.special')
      ];
      setPasswordErrors(errors);
      return;
    }

    // Check password confirmation
    if (newPassword !== confirmPassword) {
      setError(t('passwordReset.passwordMismatch'));
      return;
    }

    try {
      const response = await axios.post(
        getBackendUrl('/api/password/reset'), 
        { 
          token: resetToken, 
          newPassword, 
          confirmPassword,
          email: resetEmail
        }
      );
      
      console.log('Password Reset Response:', response.data);
      setMessage(t('passwordReset.success'));
      
      // Clear stored email
      localStorage.removeItem('resetEmail');
      
      // Redirect to login after successful reset
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (error) {
      console.error('Password reset error:', error.response || error);
      setError(
        error.response?.data?.message || 
        t('passwordReset.resetError')
      );
    }
  };

  return (
    <div className="password-reset-container">
      <h2>{t('passwordReset.title')}</h2>
      {message && <p className="success-message">{message}</p>}
      {error && <p className="error-message">{error}</p>}
      
      {stage === 'request' && (
        <form onSubmit={requestPasswordReset}>
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError('');
            }}
            placeholder={t('passwordReset.emailPlaceholder')}
            required
          />
          <button type="submit">{t('passwordReset.requestButton')}</button>
        </form>
      )}

      {stage === 'check-email' && (
        <div className="check-email-instructions">
          <p>{t('passwordReset.checkEmailInstructions')}</p>
          <p>{t('passwordReset.linkExpiration')}</p>
          <button onClick={() => setStage('request')}>
            {t('passwordReset.changeEmail')}
          </button>
        </div>
      )}

      {stage === 'reset' && (
        <form onSubmit={resetPassword}>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => {
              setNewPassword(e.target.value);
              setError('');
              setPasswordErrors([]);
            }}
            placeholder={t('passwordReset.newPasswordPlaceholder')}
            required
          />
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              setError('');
            }}
            placeholder={t('passwordReset.confirmPasswordPlaceholder')}
            required
          />
          {passwordErrors.length > 0 && (
            <div className="password-requirements">
              <p>{t('passwordReset.passwordRequirements')}:</p>
              <ul>
                {passwordErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}
          <button type="submit">{t('passwordReset.resetButton')}</button>
        </form>
      )}
    </div>
  );
};

export default PasswordReset;

import React, { useState } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
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
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [stage, setStage] = useState('request'); // 'request', 'verify', 'reset'
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [passwordErrors, setPasswordErrors] = useState([]);

  const requestPasswordReset = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(
        getBackendUrl('/api/password/request-reset'), 
        { email }
      );
      setMessage(t('passwordReset.requestSent'));
      setStage('verify');
    } catch (error) {
      console.error('Password reset request error:', error);
      setError(
        error.response?.data?.message || 
        t('passwordReset.requestError')
      );
    }
  };

  const verifyResetToken = async (e) => {
    e.preventDefault();
    try {
      await axios.post(
        getBackendUrl('/api/password/verify-token'), 
        { token: resetToken, email }
      );
      setMessage(t('passwordReset.tokenValid'));
      setStage('reset');
    } catch (error) {
      console.error('Token verification error:', error);
      setError(
        error.response?.data?.message || 
        t('passwordReset.invalidToken')
      );
    }
  };

  const resetPassword = async (e) => {
    e.preventDefault();
    
    // Clear previous errors
    setPasswordErrors([]);
    setError('');

    // Validate password
    if (!validatePassword(newPassword)) {
      setPasswordErrors([
        t('passwordReset.requirements.length'),
        t('passwordReset.requirements.uppercase'),
        t('passwordReset.requirements.lowercase'),
        t('passwordReset.requirements.number'),
        t('passwordReset.requirements.special')
      ]);
      return;
    }

    // Check password confirmation
    if (newPassword !== confirmPassword) {
      setError(t('passwordReset.passwordMismatch'));
      return;
    }

    try {
      await axios.post(
        getBackendUrl('/api/password/reset'), 
        { 
          token: resetToken, 
          newPassword, 
          confirmPassword,
          email 
        }
      );
      setMessage(t('passwordReset.success'));
      setStage('request');
      
      // Clear sensitive data
      setNewPassword('');
      setConfirmPassword('');
      setResetToken('');
    } catch (error) {
      console.error('Password reset error:', error);
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

      {stage === 'verify' && (
        <form onSubmit={verifyResetToken}>
          <input
            type="text"
            value={resetToken}
            onChange={(e) => {
              setResetToken(e.target.value);
              setError('');
            }}
            placeholder={t('passwordReset.tokenPlaceholder')}
            required
          />
          <button type="submit">{t('passwordReset.verifyButton')}</button>
        </form>
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

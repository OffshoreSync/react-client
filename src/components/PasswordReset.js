import React, { useState } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import getBackendUrl from '../utils/apiUtils';

const PasswordReset = () => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [stage, setStage] = useState('request'); // 'request', 'verify', 'reset'
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

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
        { token: resetToken }
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
    try {
      await axios.post(
        getBackendUrl('/api/password/reset'), 
        { token: resetToken, newPassword }
      );
      setMessage(t('passwordReset.success'));
      setStage('request');
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
            }}
            placeholder={t('passwordReset.newPasswordPlaceholder')}
            required
          />
          <button type="submit">{t('passwordReset.resetButton')}</button>
        </form>
      )}
    </div>
  );
};

export default PasswordReset;

import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('healthify_token') || null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state from stored token
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('healthify_token');
      if (!storedToken) {
        setLoading(false);
        return;
      }

      try {
        const data = await api.get('/auth/me');
        setUser(data.user);
      } catch (err) {
        console.warn('Session expired or invalid:', err.message);
        localStorage.removeItem('healthify_token');
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    const handleAuthChange = () => {
      setUser(null);
      setToken(null);
    };

    window.addEventListener('healthify_auth_change', handleAuthChange);
    return () => window.removeEventListener('healthify_auth_change', handleAuthChange);
  }, []);

  const handleAuthSuccess = (data) => {
    if (data.token) {
      localStorage.setItem('healthify_token', data.token);
      setToken(data.token);
    }
    if (data.user) {
      setUser(data.user);
      if (data.user.preferredLanguage) {
        localStorage.setItem('healthify_language', data.user.preferredLanguage);
      }
    }
    return data;
  };

  const sendOtp = async (phone) => {
    return api.post('/auth/send-otp', { phone });
  };

  const verifyOtp = async (phone, otp) => {
    const data = await api.post('/auth/verify-otp', { phone, otp });
    return handleAuthSuccess(data);
  };

  const loginWithEmail = async (email, password) => {
    const data = await api.post('/auth/login', { email, password });
    return handleAuthSuccess(data);
  };

  const registerWithEmail = async (payload) => {
    const data = await api.post('/auth/register', payload);
    return handleAuthSuccess(data);
  };

  const socialLogin = async (provider, email, name) => {
    const data = await api.post('/auth/social', { provider, email, name });
    return handleAuthSuccess(data);
  };

  const loginAsDemo = async () => {
    const data = await api.post('/auth/demo');
    return handleAuthSuccess(data);
  };

  const logout = async () => {
    try {
      if (token) {
        await api.post('/auth/logout');
      }
    } catch (e) {
      // Ignore network errors on logout
    } finally {
      localStorage.removeItem('healthify_token');
      setToken(null);
      setUser(null);
    }
  };

  const updateUserLocal = (updatedUser) => {
    setUser((prev) => ({ ...prev, ...updatedUser }));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: Boolean(user && token),
        loading,
        sendOtp,
        verifyOtp,
        loginWithEmail,
        registerWithEmail,
        socialLogin,
        loginAsDemo,
        logout,
        updateUserLocal,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;

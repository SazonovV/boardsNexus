import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { User } from '../types';
import { apiService, authErrorEvent } from '../services/api';
import { useNavigate, useLocation } from 'react-router-dom';

interface AuthContextType {
  user: User | null;
  login: (telegramLogin: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const STORAGE_KEY = 'trello_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem(STORAGE_KEY);
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [user]);

  useEffect(() => {
    // Handle auth errors
    const handleAuthError = () => {
      logout();
      // Save the current location to redirect back after login
      if (location.pathname !== '/login') {
        navigate('/login', { state: { from: location.pathname } });
      }
    };

    authErrorEvent.addEventListener('authError', handleAuthError);
    return () => {
      authErrorEvent.removeEventListener('authError', handleAuthError);
    };
  }, [navigate, location]);

  const login = async (telegramLogin: string, password: string) => {
    try {
      const data = await apiService.login(telegramLogin, password);
      setUser(data.user);
      // Check if there's a redirect location
      const state = location.state as { from?: string };
      navigate(state?.from || '/');
    } catch (error) {
      throw new Error('Login failed');
    }
  };

  const logout = useCallback(() => {
    apiService.logout();
    setUser(null);
    navigate('/login');
  }, [navigate]);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}; 
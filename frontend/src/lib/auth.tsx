'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { authApi } from './api';

export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  role: 'player' | 'host' | 'admin';
  totalWins?: number;
  totalGamesPlayed?: number;
  totalPoints?: number;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { name: string; username: string; email: string; password: string }) => Promise<void>;
  logout: () => void;
  isHost: boolean;
  isPlayer: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restore from localStorage
    const storedToken = localStorage.getItem('bappaverse_token');
    const storedUser = localStorage.getItem('bappaverse_user');
    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem('bappaverse_token');
        localStorage.removeItem('bappaverse_user');
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login({ email, password });
    const { token: newToken, user: newUser } = res.data;
    localStorage.setItem('bappaverse_token', newToken);
    localStorage.setItem('bappaverse_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  }, []);

  const register = useCallback(
    async (data: { name: string; username: string; email: string; password: string }) => {
      const res = await authApi.register(data);
      const { token: newToken, user: newUser } = res.data;
      localStorage.setItem('bappaverse_token', newToken);
      localStorage.setItem('bappaverse_user', JSON.stringify(newUser));
      setToken(newToken);
      setUser(newUser);
    },
    []
  );

  const logout = useCallback(() => {
    localStorage.removeItem('bappaverse_token');
    localStorage.removeItem('bappaverse_user');
    setToken(null);
    setUser(null);
    window.location.href = '/login';
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        isHost:
          user?.role === 'host' ||
          user?.role === 'admin' ||
          !!user?.email?.toLowerCase().includes('sakshi') ||
          !!user?.email?.toLowerCase().includes('admin'),
        isPlayer: user?.role === 'player',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

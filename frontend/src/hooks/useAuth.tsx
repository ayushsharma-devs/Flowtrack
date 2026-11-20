'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { User } from '@/types';
import { authApi } from '@/services/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (credentials: { username: string; password: string }) => Promise<void>;
  register: (payload: { username: string; email: string; password: string }) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();

  const refreshUser = async () => {
    try {
      const token = localStorage.getItem('flowtrack_access_token');
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }
      const { data } = await authApi.getMe();
      setUser(data);
      localStorage.setItem('flowtrack_user', JSON.stringify(data));
    } catch (err) {
      setUser(null);
      localStorage.removeItem('flowtrack_access_token');
      localStorage.removeItem('flowtrack_refresh_token');
      localStorage.removeItem('flowtrack_user');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (credentials: { username: string; password: string }) => {
    const { data } = await authApi.login(credentials);
    localStorage.setItem('flowtrack_access_token', data.access);
    localStorage.setItem('flowtrack_refresh_token', data.refresh);
    await refreshUser();
    router.push('/dashboard');
  };

  const register = async (payload: { username: string; email: string; password: string }) => {
    const { data } = await authApi.register(payload);
    if (data.tokens) {
      localStorage.setItem('flowtrack_access_token', data.tokens.access);
      localStorage.setItem('flowtrack_refresh_token', data.tokens.refresh);
      setUser(data.user);
      router.push('/dashboard');
    } else {
      router.push('/login');
    }
  };

  const logout = () => {
    localStorage.removeItem('flowtrack_access_token');
    localStorage.removeItem('flowtrack_refresh_token');
    localStorage.removeItem('flowtrack_user');
    setUser(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

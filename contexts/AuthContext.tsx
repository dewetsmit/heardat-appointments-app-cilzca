
import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { apiRequest, getAuthHeader } from '@/utils/api';
import { User } from '@/types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string, fullName: string, role: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  async function loadStoredAuth() {
    console.log('Loading stored auth...');
    try {
      const storedToken = await SecureStore.getItemAsync('auth_token');
      if (storedToken) {
        console.log('Found stored token, fetching user data...');
        setToken(storedToken);
        const userData = await apiRequest('/api/auth/me', {
          headers: getAuthHeader(storedToken),
        });
        setUser(userData.user);
        console.log('User loaded:', userData.user);
      }
    } catch (error) {
      console.error('Failed to load stored auth:', error);
      await SecureStore.deleteItemAsync('auth_token');
    } finally {
      setIsLoading(false);
    }
  }

  async function login(username: string, password: string) {
    console.log('Logging in user:', username);
    try {
      const response = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });

      setUser(response.user);
      setToken(response.token);
      await SecureStore.setItemAsync('auth_token', response.token);
      console.log('Login successful:', response.user);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }

  async function register(
    username: string,
    email: string,
    password: string,
    fullName: string,
    role: string
  ) {
    console.log('Registering user:', username);
    try {
      const response = await apiRequest('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          username,
          email,
          password,
          full_name: fullName,
          role,
        }),
      });

      setUser(response.user);
      setToken(response.token);
      await SecureStore.setItemAsync('auth_token', response.token);
      console.log('Registration successful:', response.user);
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  }

  async function logout() {
    console.log('Logging out user');
    setUser(null);
    setToken(null);
    await SecureStore.deleteItemAsync('auth_token');
  }

  async function resetPassword(email: string) {
    console.log('Resetting password for:', email);
    try {
      await apiRequest('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      console.log('Password reset email sent');
    } catch (error) {
      console.error('Password reset failed:', error);
      throw error;
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        logout,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

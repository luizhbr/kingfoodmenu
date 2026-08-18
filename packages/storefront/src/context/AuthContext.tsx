import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { withCsrf } from '../lib/csrf.js';
const API_BASE = import.meta.env.VITE_API_URL || '';

interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string, captchaToken?: string) => Promise<void>;
  register: (data: { email: string; password: string; name: string; phone?: string }) => Promise<void>;
  loginWithToken: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState(!!localStorage.getItem('token'));

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
  }, []);

  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    fetch(`${API_BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Invalid token');
        return res.json();
      })
      .then((data) => {
        // /api/auth/me returns { type: 'customer'|'staff', user|customer }.
        // Normalize to the storefront User shape: only customers are "logged in"
        // here; a staff token (shared localStorage key with /admin) must NOT
        // hide the guest fields on checkout.
        const d = data.data;
        if (d?.type === 'customer' && d.customer) setUser(d.customer);
        else if (d?.type === 'staff' && d.user) setUser(null);
        else setUser(d); // legacy/direct shape fallback
      })
      .catch(() => logout())
      .finally(() => setIsLoading(false));
  }, [token, logout]);

  async function login(email: string, password: string, captchaToken?: string) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    await withCsrf(headers);
    const body: Record<string, string> = { email, password };
    if (captchaToken) body.captchaToken = captchaToken;
    const res = await fetch(`${API_BASE}/api/auth/customer/login`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    localStorage.setItem('token', data.data.token);
    setToken(data.data.token);
    setUser(data.data.user);
  }

  function loginWithToken(newToken: string) {
    localStorage.setItem('token', newToken);
    setToken(newToken);
  }

  async function register(input: { email: string; password: string; name: string; phone?: string }) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    await withCsrf(headers);
    const res = await fetch(`${API_BASE}/api/auth/customer/register`, {
      method: 'POST',
      headers,
      body: JSON.stringify(input),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registration failed');
    localStorage.setItem('token', data.data.token);
    setToken(data.data.token);
    setUser(data.data.user);
  }

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, loginWithToken, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

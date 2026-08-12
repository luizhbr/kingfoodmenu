import { create } from 'zustand';
import * as SecureStorage from '../lib/secure-storage';
import { apiClient } from '../api/client';
import type { ApiResponse } from '../api/types';

const DRIVER_TOKEN_KEY = 'driver_token';
const DRIVER_USER_KEY = 'driver_user';

export interface DriverUser {
  id: string;
  email: string;
  name: string;
  role: string;
  phone?: string | null;
  avatar?: string | null;
}

interface DriverAuthState {
  user: DriverUser | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
}

export const useDriverAuthStore = create<DriverAuthState>((set, get) => ({
  user: null,
  token: null,
  isLoading: true,

  async login(email, password) {
    // Staff login endpoint — validates role DRIVER server-side via /api/driver/*
    const res = await apiClient<ApiResponse<{ token: string; user: DriverUser }>>('/api/auth/staff/login', {
      method: 'POST',
      body: { email, password },
      auth: false,
    });
    const { token, user } = res.data!;
    if (user.role !== 'DRIVER') {
      throw new Error('Esta conta não é de entregador (role DRIVER)');
    }
    await SecureStorage.setItem(DRIVER_TOKEN_KEY, token);
    await SecureStorage.setItem(DRIVER_USER_KEY, JSON.stringify(user));
    set({ token, user });
  },

  async logout() {
    await SecureStorage.deleteItem(DRIVER_TOKEN_KEY);
    await SecureStorage.deleteItem(DRIVER_USER_KEY);
    set({ user: null, token: null });
  },

  async restoreSession() {
    try {
      const token = await SecureStorage.getItem(DRIVER_TOKEN_KEY);
      if (!token) {
        set({ isLoading: false });
        return;
      }
      set({ token });
      const res = await apiClient<ApiResponse<{ user: DriverUser }>>('/api/auth/me');
      const user = res.data!.user;
      if (user.role !== 'DRIVER') {
        await get().logout();
        set({ isLoading: false });
        return;
      }
      set({ user, isLoading: false });
    } catch {
      await SecureStorage.deleteItem(DRIVER_TOKEN_KEY);
      set({ user: null, token: null, isLoading: false });
    }
  },
}));

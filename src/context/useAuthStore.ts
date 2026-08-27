import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'SUPER_ADMIN' | 'ORG_ADMIN' | 'ENUMERATOR';
  organizationId?: string;
  organizationName?: string;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, role?: string, organizationId?: string) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
  clearError: () => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      isLoading: false,
      error: null,

      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const res = await axios.post(`${API_URL}/auth/login`, { email, password });
          const { tokens, user } = res.data;
          const accessToken = tokens?.accessToken || res.data.access_token || res.data.token;
          const refreshToken = tokens?.refreshToken;
          set({ token: accessToken, refreshToken, user, isLoading: false });
        } catch (err: any) {
          const msg =
            err.response?.data?.message || 'Login failed. Check your credentials.';
          set({ error: typeof msg === 'string' ? msg : msg.join(', '), isLoading: false });
          throw err;
        }
      },

      register: async (name, email, password, role, organizationId) => {
        set({ isLoading: true, error: null });
        try {
          const res = await axios.post(`${API_URL}/auth/register`, {
            name,
            email,
            password,
            role,
            organizationId,
          });
          const { tokens, user } = res.data;
          const accessToken = tokens?.accessToken || res.data.access_token || res.data.token;
          const refreshToken = tokens?.refreshToken;
          set({ token: accessToken, refreshToken, user, isLoading: false });
        } catch (err: any) {
          const msg =
            err.response?.data?.message || 'Registration failed. Try a different email.';
          set({ error: typeof msg === 'string' ? msg : msg.join(', '), isLoading: false });
          throw err;
        }
      },

      logout: () => set({ user: null, token: null, refreshToken: null }),

      loadUser: async () => {
        const token = get().token;
        if (!token) return;
        try {
          const res = await axios.get(`${API_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          set({ user: res.data });
        } catch {
          set({ user: null, token: null, refreshToken: null });
        }
      },

      setTokens: (accessToken: string, refreshToken: string) => {
        set({ token: accessToken, refreshToken });
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'fb-auth-v1',
      partialize: (state) => ({ token: state.token, refreshToken: state.refreshToken, user: state.user }),
    }
  )
);
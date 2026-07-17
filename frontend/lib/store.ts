import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from './types';

interface AuthState {
  token: string | null;
  user: User | null;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      setAuth: (token, user) => set({ token, user }),
      logout: () => {
        set({ token: null, user: null });
        if (typeof window !== 'undefined') {
          localStorage.removeItem('growpido_token');
          localStorage.removeItem('growpido_user');
          window.location.href = '/login';
        }
      },
      isAuthenticated: () => !!get().token,
    }),
    {
      name: 'growpido-auth',
      onRehydrateStorage: () => (state) => {
        // Sync to localStorage for axios interceptor
        if (state?.token && typeof window !== 'undefined') {
          localStorage.setItem('growpido_token', state.token);
        }
      },
    }
  )
);

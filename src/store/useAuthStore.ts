import { create } from 'zustand';
import { User } from '../types';

interface AuthState {
  user: User | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),
  logout: async () => {
    try {
      // Lazy import to avoid circular dependency issues at startup
      const { account } = require('../config/appwrite');
      await account.deleteSession('current');
    } catch (e) {
      // Ignore errors on logout
    } finally {
      try {
        const { useAppStore } = require('./useAppStore');
        useAppStore.getState().clearAll();
      } catch {}
      set({ user: null });
    }
  },
}));

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, Store } from '@/types';

interface AuthState {
  user: User | null;
  store: { id: string; name: string; logo?: string } | null;
  isAuthenticated: boolean;
  setAuth: (user: User, store: { id: string; name: string; logo?: string }) => void;
  clearAuth: () => void;
  updateUser: (data: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      store: null,
      isAuthenticated: false,
      setAuth: (user, store) => set({ user, store, isAuthenticated: true }),
      clearAuth: () => set({ user: null, store: null, isAuthenticated: false }),
      updateUser: (data) =>
        set((state) => ({ user: state.user ? { ...state.user, ...data } : null })),
    }),
    { name: 'neighbormart-auth' }
  )
);

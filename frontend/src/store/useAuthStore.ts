import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  userId: string | null;
  role: 'Client' | 'Admin' | null;
  name: string | null;
  login: (userId: string, role: 'Client' | 'Admin', name: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      userId: null,
      role: null,
      name: null,
      isAuthenticated: false,
      login: (userId, role, name) => set({ userId, role, name, isAuthenticated: true }),
      logout: () => set({ userId: null, role: null, name: null, isAuthenticated: false }),
    }),
    {
      name: 'auth-storage',
    }
  )
);

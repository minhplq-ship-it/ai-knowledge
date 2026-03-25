// stores/auth.store.ts - cookie-based auth
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api } from '@/lib/axios'

interface User {
  id: string
  name: string
  email: string
  role: string
}

interface AuthStore {
  user: User | null
  token: string | null
  isAuthenticated: boolean

  login: (email: string, password: string) => Promise<void>
  register: (
    name: string,
    email: string,
    password: string,
    securityQuestion: string,
    securityAnswer: string,
  ) => Promise<void>
  logout: () => Promise<void>
  fetchMe: () => Promise<void>
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: async (email, password) => {
        await api.post('/auth/login', { email, password })
        const me = await api.get('/auth/me')
        set({ user: me.data, isAuthenticated: true })
      },

      register: async (
        name,
        email,
        password,
        securityQuestion,
        securityAnswer,
      ) => {
        await api.post('/auth/register', {
          name,
          email,
          password,
          securityQuestion,
          securityAnswer,
        })
      },

      logout: async () => {
        try {
          await api.post('/auth/logout')
        } catch {
        } finally {
          set({ user: null, token: null, isAuthenticated: false })
          window.location.href = '/login'
        }
      },

      fetchMe: async () => {
        try {
          const { data } = await api.get('/auth/me')

          set({ user: data, isAuthenticated: true })
        } catch (error) {
          set({ user: null, token: null, isAuthenticated: false })
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
)

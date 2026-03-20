// src/stores/auth.store.ts
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
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => void
  fetchMe: () => Promise<void>
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: async (email, password) => {
  // BE không trả accessToken trong body → bỏ dòng này
  // localStorage.setItem('token', data.accessToken)  ← xóa

  await api.post('/auth/login', { email, password })
  // Cookie tự được set bởi BE, không cần lưu thủ công

  const me = await api.get('/auth/me')
  set({ user: me.data, isAuthenticated: true })
},

      register: async (name, email, password) => {
        await api.post('/auth/register', { name, email, password })
      },

      logout: () => {
        localStorage.removeItem('token')
        set({ user: null, token: null, isAuthenticated: false })
        window.location.href = '/login'
      },

      fetchMe: async () => {
        try {
          const { data } = await api.get('/auth/me')
          set({ user: data, isAuthenticated: true })
        } catch {
          set({ user: null, token: null, isAuthenticated: false })
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ token: state.token }),
    },
  ),
)
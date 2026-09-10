import { create } from 'zustand'
import { authApi, userApi } from '../api/endpoints'
import { getToken, setToken, clearToken } from '../api/token'

export const useAuthStore = create((set) => ({
  user: null,
  status: 'idle', // idle | checking | authenticated | unauthenticated

  async bootstrap() {
    if (!getToken()) {
      set({ status: 'unauthenticated', user: null })
      return
    }
    set({ status: 'checking' })
    try {
      const { user } = await authApi.me()
      set({ user, status: 'authenticated' })
    } catch {
      clearToken()
      set({ user: null, status: 'unauthenticated' })
    }
  },

  async login({ email, password }) {
    const data = await authApi.login({ email, password })
    setToken(data.token)
    set({ user: data.user, status: 'authenticated' })
    return data.user
  },

  async register(payload) {
    const data = await authApi.register(payload)
    setToken(data.token)
    set({ user: data.user, status: 'authenticated' })
    return data.user
  },

  async updateProfile(payload) {
    const { user } = await userApi.update(payload)
    set({ user })
    return user
  },

  logout() {
    setToken(null)
    set({ user: null, status: 'unauthenticated' })
  },
}))
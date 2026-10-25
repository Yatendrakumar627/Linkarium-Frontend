import { create } from 'zustand'
import { notifications } from '@mantine/notifications'
import { authApi, userApi } from '../api/endpoints'
import { setToken, clearToken, setLoggingOut } from '../api/token'
import { useLinkStore } from './linkStore'
import { useUiStore } from './uiStore'

// Drop all per-user data (links, collections, map, selection, current view) so
// nothing leaks across a logout / account switch on a shared device.
function resetUserState() {
  useLinkStore.getState().reset()
  useUiStore.getState().reset()
}

export const useAuthStore = create((set) => ({
  user: null,
  status: 'idle', // idle | checking | authenticated | unauthenticated

  async bootstrap() {
    if (useAuthStore.getState().status === 'checking') return
    set({ status: 'checking' })
    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Auth check timeout')), 15000)
      )
      const res = await Promise.race([authApi.refresh(), timeoutPromise])
      const t = res?.accessToken || res?.token
      if (t) setToken(t)
      if (res?.user) set({ user: res.user, status: 'authenticated' })
      else set({ status: 'unauthenticated', user: null })
    } catch {
      clearToken()
      resetUserState()
      set({ user: null, status: 'unauthenticated' })
    }
  },

  async login({ email, password }) {
    resetUserState()
    const data = await authApi.login({ email, password })
    if (data?.requiresOtp) {
      return data
    }
    const t = data.accessToken || data.token
    if (t) setToken(t)
    set({ user: data.user, status: 'authenticated' })
    return data.user
  },

  async verifyOtp({ challengeId, code }) {
    resetUserState()
    const data = await authApi.verifyOtp({ challengeId, code })
    const t = data.accessToken || data.token
    if (t) setToken(t)
    set({ user: data.user, status: 'authenticated' })
    return data.user
  },

  async register(payload) {
    resetUserState()
    const data = await authApi.register(payload)
    const t = data.accessToken || data.token
    if (t) setToken(t)
    set({ user: data.user, status: 'authenticated' })
    return data.user
  },

  async updateProfile(payload) {
    const { user } = await userApi.update(payload)
    set({ user })
    return user
  },

  // Replace the cached user after an endpoint returns an updated record
  // (e.g. preferences). Keeps the rest of the app in sync without a re-login.
  setUser(user) {
    set({ user })
  },

  async logout() {
    setLoggingOut(true)
    notifications.clean()
    try {
      await authApi.logout()
    } catch {
      // ignore
    }
    clearToken()
    resetUserState()
    set({ user: null, status: 'unauthenticated' })
    notifications.clean()
    setTimeout(() => {
      setLoggingOut(false)
      notifications.clean()
    }, 400)
  },
}))
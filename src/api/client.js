import { getToken, clearToken } from './token'

const API_BASE = import.meta.env.VITE_API_BASE
const BASE = API_BASE ? `${API_BASE.replace(/\/+$/, '').replace(/\/api$/i, '')}/api` : '/api'

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
    this.data = null
  }
}

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (auth) {
    const token = getToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }

  let res
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError('Network error. Is the backend running?', 0)
  }

  if (res.status === 401 && auth) {
    clearToken()
    if (!window.location.pathname.startsWith('/auth')) {
      window.location.assign('/auth')
    }
    throw new ApiError('Session expired. Please sign in again.', 401)
  }

  const text = await res.text()
  let data = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = null
    }
  }

  if (!res.ok) {
    const err = new ApiError(data?.error || res.statusText || 'Request failed', res.status)
    err.data = data
    throw err
  }
  return data
}

export const api = {
  get: (path) => request(path),
  post: (path, body, opts) => request(path, { method: 'POST', body, ...opts }),
  patch: (path, body) => request(path, { method: 'PATCH', body }),
  del: (path) => request(path, { method: 'DELETE' }),
  upload: (path, formData) => {
    const token = getToken()
    const headers = {}
    if (token) headers.Authorization = `Bearer ${token}`
    return fetch(`${BASE}${path}`, {
      method: 'POST',
      headers,
      body: formData,
    }).then(async (res) => {
      const text = await res.text()
      let data = null
      if (text) {
        try { data = JSON.parse(text) } catch { data = null }
      }
      if (!res.ok) throw new ApiError(data?.error || res.statusText || 'Upload failed', res.status)
      return data
    })
  },
  download: (path) => {
    const token = getToken()
    const headers = {}
    if (token) headers.Authorization = `Bearer ${token}`
    return fetch(`${BASE}${path}`, { headers }).then(async (res) => {
      if (!res.ok) {
        const text = await res.text()
        let data = null
        try { data = JSON.parse(text) } catch { data = null }
        throw new ApiError(data?.error || res.statusText || 'Download failed', res.status)
      }
      const disposition = res.headers.get('Content-Disposition') || ''
      const match = disposition.match(/filename="?([^"]+)"?/)
      const filename = match ? match[1] : 'export.xlsx'
      const blob = await res.blob()
      return { blob, filename }
    })
  },
}
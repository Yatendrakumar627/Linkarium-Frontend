import { getToken, setToken, clearToken, getIsLoggingOut } from './token'

const API_BASE = import.meta.env.VITE_API_BASE
const BASE = API_BASE ? `${API_BASE.replace(/\/+$/, '').replace(/\/api$/i, '')}/api` : '/api'

class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
    this.data = null
    this.silent = false
  }
}

async function parseBody(res) {
  const text = await res.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

// Single-flight refresh so parallel 401s or bootstrap calls share one round-trip instead of
// stampeding the refresh endpoint or tripping token reuse detection.
let refreshPromise = null

export async function refreshSession() {
  if (refreshPromise) return refreshPromise
  refreshPromise = fetch(`${BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  })
    .then(async (res) => {
      const data = await parseBody(res)
      if (!res.ok) {
        throw new ApiError(data?.error || 'refresh failed', res.status)
      }
      const token = data?.accessToken || data?.token
      if (!token) throw new ApiError('No token returned from refresh', 401)
      setToken(token)
      return data
    })
    .finally(() => {
      refreshPromise = null
    })
  return refreshPromise
}

async function doRefresh() {
  const data = await refreshSession()
  return data?.accessToken || data?.token
}

// Drop the in-memory access token and send the user back to the sign-in page.
function endSession() {
  clearToken()
  if (getIsLoggingOut()) return
  if (
    typeof window !== 'undefined' &&
    !window.location.pathname.startsWith('/auth') &&
    !window.location.pathname.startsWith('/s/')
  ) {
    window.location.assign('/auth')
  }
}



// The access token lives in memory only; the long-lived refresh token is an
// httpOnly cookie, so every request is sent with credentials.
async function fetchWithAuth(path, options, triedRefresh = false) {
  const { method = 'GET', body, auth = true, headers: extraHeaders = {} } = options
  const headers = { ...extraHeaders }
  if (body && !(body instanceof FormData)) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json'
  }
  if (auth) {
    const token = getToken()
    if (token) headers.Authorization = `Bearer ${token}`
    const apiKey = typeof localStorage !== 'undefined' ? localStorage.getItem('linkarium.apiKey') : null
    if (apiKey && !headers['X-API-Key']) headers['X-API-Key'] = apiKey
  }

  let res
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body instanceof FormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
      credentials: 'include',
    })
  } catch {
    throw new ApiError('Network error. Is the backend running?', 0)
  }

  // One transparent refresh attempt for protected endpoints.
  if (res.status === 401 && auth && !triedRefresh) {
    if (getIsLoggingOut() || (typeof window !== 'undefined' && window.location.pathname.startsWith('/auth'))) {
      const silentErr = new ApiError('Logged out', 401)
      silentErr.silent = true
      throw silentErr
    }
    try {
      await doRefresh()
      return await fetchWithAuth(path, options, true)
    } catch {
      endSession()
      const err = new ApiError('Session expired. Please sign in again.', 401)
      if (getIsLoggingOut()) err.silent = true
      throw err
    }
  }

  return res
}

async function request(path, { method = 'GET', body, auth = true, headers } = {}) {
  const res = await fetchWithAuth(path, { method, body, auth, headers })
  const data = await parseBody(res)

  if (!res.ok) {
    if (res.status === 401 && auth) endSession()
    if (res.status === 403 && path.startsWith('/admin')) {
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/auth')) {
        window.location.assign('/')
      }
    }
    const err = new ApiError(data?.error || res.statusText || 'Request failed', res.status)
    err.data = data
    throw err
  }
  return data
}

export const api = {
  get: (path, opts) => request(path, opts),
  post: (path, body, opts) => request(path, { method: 'POST', body, ...opts }),
  patch: (path, body, opts) => request(path, { method: 'PATCH', body, ...opts }),
  del: (path, opts) => request(path, { method: 'DELETE', ...opts }),
  upload: (path, formData, opts) =>
    fetchWithAuth(path, { method: 'POST', body: formData, ...opts }).then(async (res) => {
      const data = await parseBody(res)
      if (!res.ok) {
        if (res.status === 401) endSession()
        throw new ApiError(data?.error || res.statusText || 'Upload failed', res.status)
      }
      return data
    }),
  download: (path, opts) =>
    fetchWithAuth(path, { method: 'GET', ...opts }).then(async (res) => {
      if (!res.ok) {
        const data = await parseBody(res)
        if (res.status === 401) endSession()
        throw new ApiError(data?.error || res.statusText || 'Download failed', res.status)
      }
      const disposition = res.headers.get('Content-Disposition') || ''
      const match = disposition.match(/filename="?([^"]+)"?/)
      const filename = match ? match[1] : 'export.xlsx'
      const blob = await res.blob()
      return { blob, filename }
    }),
}

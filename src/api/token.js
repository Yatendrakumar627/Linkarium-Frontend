let accessToken = null
let isLoggingOut = false

export function getToken() {
  return accessToken
}

export function setToken(token) {
  accessToken = token || null
}

export function clearToken() {
  accessToken = null
}

export function setLoggingOut(val) {
  isLoggingOut = Boolean(val)
}

export function getIsLoggingOut() {
  return isLoggingOut
}


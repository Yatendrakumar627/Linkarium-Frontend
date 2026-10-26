import { api, refreshSession } from './client'
import { withQuery } from '../utils'

export const authApi = {
  register: (payload) => api.post('/auth/register', payload, { auth: false }),
  login: (payload) => api.post('/auth/login', payload, { auth: false }),
  verifyOtp: (payload) => api.post('/auth/verify-otp', payload, { auth: false }),
  refresh: () => refreshSession(),
  logout: () => api.post('/auth/logout'),
}

export const linksApi = {
  list: (params = {}) => api.get(withQuery('/links', params)),
  create: (payload) => api.post('/links', payload),
  update: (id, payload) => api.patch(`/links/${id}`, payload),
  remove: (id) => api.del(`/links/${id}`),
  restore: (id) => api.post(`/links/${id}/restore`),
  permanentDelete: (id) => api.del(`/links/${id}/permanent`),
  trash: (params = {}) => api.get(withQuery('/links/trash', params)),
  emptyTrash: () => api.post('/links/trash/empty'),
  visit: (id) => api.post(`/links/${id}/visit`),
  import: (file) => {
    const fd = new FormData()
    fd.append('file', file)
    return api.upload('/links/import', fd)
  },
  export: (format = 'xlsx', ids = null) => {
    const params = new URLSearchParams({ format })
    if (Array.isArray(ids) && ids.length) params.set('ids', ids.join(','))
    return api.download(`/links/export?${params.toString()}`)
  },
  bulkDelete: (ids) => api.post('/links/bulk-delete', { ids }),
  bulkMove: (ids, collectionId) => api.post('/links/bulk-move', { ids, collectionId }),
  bulkRestore: (ids) => api.post('/links/bulk-restore', { ids }),
  bulkPermanentDelete: (ids) => api.post('/links/bulk-permanent-delete', { ids }),
  // --- V3: link lifecycle ---
  archive: (id) => api.post(`/links/${id}/archive`),
  unarchive: (id) => api.post(`/links/${id}/unarchive`),
  bulkArchive: (ids) => api.post('/links/bulk-archive', { ids }),
  bulkUnarchive: (ids) => api.post('/links/bulk-unarchive', { ids }),
  bulkTag: (ids, tags, mode = 'add') => api.post('/links/bulk-tag', { ids, tags, mode }),
  merge: (sourceId, targetId) => api.post(`/links/${sourceId}/merge`, { targetId }),
  duplicates: (params = {}) => api.get(withQuery('/links/duplicates', params)),
  enrich: (id) => api.post(`/links/${id}/enrich`),
  applyRules: (id) => api.post(`/links/${id}/apply-rules`),
  applyRulesBulk: (ids) => api.post('/links/apply-rules', { ids }),
  article: (id) => api.get(`/links/${id}/article`),
}

export const collectionsApi = {
  list: () => api.get('/collections'),
  create: (payload) => api.post('/collections', payload),
  update: (id, payload) => api.patch(`/collections/${id}`, payload),
  remove: (id) => api.del(`/collections/${id}`),
  share: (id, payload = {}) => api.post(`/collections/${id}/share`, payload),
  unshare: (id) => api.del(`/collections/${id}/share`),
}

export const tagsApi = {
  list: () => api.get('/tags'),
  updateColor: (tag, color) => api.patch(`/tags/${encodeURIComponent(tag)}/color`, { color }),
  rename: (tag, newTag) => api.patch(`/tags/${encodeURIComponent(tag)}/rename`, { newTag }),
  remove: (tag) => api.del(`/tags/${encodeURIComponent(tag)}`),
}

export const searchApi = {
  suggest: (q) => api.get(withQuery('/search/suggest', { q })),
}

export const analyticsApi = {
  summary: () => api.get('/analytics/summary'),
  recentlyVisited: () => api.get('/analytics/recently-visited'),
  topLinks: () => api.get('/analytics/top-links'),
  visits: (days = 14, tz) => api.get(withQuery('/analytics/visits', { days, tz })),
}

export const userApi = {
  update: (payload) => api.patch('/user/me', payload),
  preferences: (payload) => api.patch('/user/preferences', payload),
  totpStatus: () => api.get('/user/totp'),
  totpSetup: () => api.post('/user/totp/setup'),
  totpEnable: (code) => api.post('/user/totp/enable', { code }),
  totpDisable: (payload) => api.post('/user/totp/disable', payload),
}

export const metadataApi = {
  suggest: (url) => api.post('/metadata', { url }),
}

export const enrichApi = {
  // Read a page's OpenGraph card without saving anything.
  preview: (url) => api.post('/enrich/preview', { url }),
  link: (id) => api.post(`/links/${id}/enrich`),
}

export const linkHealthApi = {
  summary: () => api.get('/link-health/summary'),
}

export const savedViewsApi = {
  list: () => api.get('/saved-views'),
  create: (payload) => api.post('/saved-views', payload),
  update: (id, payload) => api.patch(`/saved-views/${id}`, payload),
  remove: (id) => api.del(`/saved-views/${id}`),
  reorder: (order) => api.post('/saved-views/reorder', { order }),
  preview: (query) => api.post('/saved-views/preview', { query }),
  run: (id, dryRun = false) => api.post(`/saved-views/${id}/run`, { dryRun }),
}

export const insightsApi = {
  resurface: (limit = 12) => api.get(withQuery('/insights/resurface', { limit })),
}

export const sessionsApi = {
  list: () => api.get('/sessions'),
  revoke: (id) => api.del(`/sessions/${id}`),
  revokeOthers: () => api.post('/sessions/revoke-others'),
}

export const apiKeysApi = {
  list: () => api.get('/api-keys'),
  create: (payload) => api.post('/api-keys', payload),
  remove: (id) => api.del(`/api-keys/${id}`),
}

export const shareApi = {
  public: (slug) => api.get(`/share/${slug}`, { auth: false }),
}

export const adminApi = {
  overview: () => api.get('/admin/overview'),
  users: (params = {}) => api.get(withQuery('/admin/users', params)),
  user: (id) => api.get(`/admin/users/${id}`),
  userLinks: (id, params = {}) => api.get(withQuery(`/admin/users/${id}/links`, params)),
  updateStatus: (id, status) => api.patch(`/admin/users/${id}/status`, { status }),
  updateRole: (id, role) => api.patch(`/admin/users/${id}/role`, { role }),
  resetSessions: (id) => api.post(`/admin/users/${id}/reset-sessions`),
  resetPassword: (id, newPassword) => api.post(`/admin/users/${id}/reset-password`, { newPassword }),
  deleteUser: (id) => api.del(`/admin/users/${id}`),
  links: (params = {}) => api.get(withQuery('/admin/links', params)),
  deleteLink: (id) => api.del(`/admin/links/${id}`),
  sessions: (params = {}) => api.get(withQuery('/admin/sessions', params)),
  revokeSession: (id) => api.del(`/admin/sessions/${id}`),
  exportReport: (format = 'xlsx') => api.download(`/admin/export?format=${format}`),
  databaseOverview: () => api.get('/admin/database/overview'),
  databaseCollection: (name, params = {}) => api.get(withQuery(`/admin/database/collection/${name}`, params)),
  databaseDump: () => api.download('/admin/database/dump'),
  activityStream: () => api.get('/admin/activity'),
}


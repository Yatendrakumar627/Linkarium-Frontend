import { api } from './client'
import { withQuery } from '../utils'

export const authApi = {
  register: (payload) => api.post('/auth/register', payload, { auth: false }),
  login: (payload) => api.post('/auth/login', payload, { auth: false }),
  me: () => api.get('/auth/me'),
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
  export: (format = 'xlsx') => api.download(`/links/export?format=${format}`),
  bulkDelete: (ids) => api.post('/links/bulk-delete', { ids }),
  bulkMove: (ids, collectionId) => api.post('/links/bulk-move', { ids, collectionId }),
  bulkRestore: (ids) => api.post('/links/bulk-restore', { ids }),
  bulkPermanentDelete: (ids) => api.post('/links/bulk-permanent-delete', { ids }),
}

export const collectionsApi = {
  list: () => api.get('/collections'),
  create: (payload) => api.post('/collections', payload),
  update: (id, payload) => api.patch(`/collections/${id}`, payload),
  remove: (id) => api.del(`/collections/${id}`),
}

export const tagsApi = {
  list: () => api.get('/tags'),
}

export const analyticsApi = {
  summary: () => api.get('/analytics/summary'),
  recentlyVisited: () => api.get('/analytics/recently-visited'),
  topLinks: () => api.get('/analytics/top-links'),
  visits: (days = 14, tz) => api.get(withQuery('/analytics/visits', { days, tz })),
}

export const userApi = {
  update: (payload) => api.patch('/user/me', payload),
}

export const metadataApi = {
  suggest: (url) => api.post('/metadata', { url }),
}
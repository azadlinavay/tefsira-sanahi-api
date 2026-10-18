// Thin client for the Tefsira Sanahi API (see docs/openapi.yaml).

export class ApiError extends Error {
  constructor(status, message, errors) {
    super(message)
    this.status = status
    this.errors = errors
  }
}

export function createApi({ baseUrl, token }) {
  const root = baseUrl.replace(/\/+$/, '') + '/api/v1'

  async function request(method, path, { json, form } = {}) {
    const headers = { Accept: 'application/json' }
    if (token) headers.Authorization = `Bearer ${token}`
    let body
    if (json) {
      headers['Content-Type'] = 'application/json'
      body = JSON.stringify(json)
    } else if (form) {
      body = form
    }
    // no-store: public reads are cacheable for an hour, but editors must see their changes.
    const res = await fetch(root + path, { method, headers, body, cache: 'no-store' })
    if (res.status === 204) return null
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      const msg = res.status === 404 && path.startsWith('/admin')
        ? 'Admin endpoints are off: set TEFSIRA_ADMIN_TOKEN on the server.'
        : data.message || `HTTP ${res.status}`
      throw new ApiError(res.status, msg, data.errors)
    }
    return data.data
  }

  const ayahPath = (edition, s, a) => `/admin/tafsirs/${edition}/ayahs/${s}/${a}`

  return {
    info: () => request('GET', '/'),
    surahs: () => request('GET', '/surahs'),
    tafsirs: () => request('GET', '/tafsirs'),
    surah: (edition, s) => request('GET', `/tafsirs/${edition}/surahs/${s}`),
    packages: (edition) => request('GET', `/tafsirs/${edition}/packages`),
    saveText: (edition, s, a, text) => request('PUT', `${ayahPath(edition, s, a)}/text`, { json: { text } }),
    uploadAudio: (edition, s, a, file, durationMs) => {
      const form = new FormData()
      form.append('audio', file)
      if (durationMs) form.append('duration_ms', String(durationMs))
      return request('POST', `${ayahPath(edition, s, a)}/audio`, { form })
    },
    deleteAudio: (edition, s, a) => request('DELETE', `${ayahPath(edition, s, a)}/audio`),
    buildPackage: (edition, scope, number) => request('POST', `/admin/tafsirs/${edition}/packages`, { json: { scope, number } }),
  }
}

/** Reads an MP3's length in the browser so the API can store it. */
export function audioDuration(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const audio = new Audio()
    audio.preload = 'metadata'
    audio.onloadedmetadata = () => { URL.revokeObjectURL(url); resolve(Math.round(audio.duration * 1000) || null) }
    audio.onerror = () => { URL.revokeObjectURL(url); resolve(null) }
    audio.src = url
  })
}
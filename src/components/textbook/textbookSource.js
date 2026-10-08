/**
 * Where textbook HTML comes from.
 *
 * Two shapes, one contract: the copy bundled under public/, or a BookML SCORM
 * bundle published by the course owner (GitHub Pages). Both lay their files out
 * identically, so everything downstream only needs a base URL.
 */

export const LOCAL_TEXTBOOK_BASE = '/textbook-assets'

// Remote bundles are somebody else's HTML, so the origin is allowlisted instead
// of being taken on trust from config or a course record.
const ALLOWED_HOST_SUFFIXES = ['.github.io']
const ALLOWED_HOSTS = ['cdn.jsdelivr.net']

const env = (typeof import.meta !== 'undefined' && import.meta.env) || {}

function extraAllowedHosts() {
  return String(env.VITE_TEXTBOOK_ALLOWED_HOSTS || '')
    .split(',')
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean)
}

export function listAllowedTextbookHosts() {
  return [...ALLOWED_HOSTS, ...extraAllowedHosts()]
}

export function isAllowedTextbookOrigin(rawUrl) {
  let url
  try {
    url = new URL(String(rawUrl))
  } catch {
    return false
  }
  if (url.protocol !== 'https:') return false

  const host = url.hostname.toLowerCase()
  if (listAllowedTextbookHosts().includes(host)) return true
  return ALLOWED_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix))
}

/**
 * Accept a remote bundle root, or null when it is unusable.
 * Query strings and fragments are dropped: the base only ever names a directory.
 */
export function normalizeTextbookBaseUrl(raw) {
  if (typeof raw !== 'string') return null
  const trimmed = raw.trim()
  if (!trimmed) return null
  if (!isAllowedTextbookOrigin(trimmed)) return null

  const url = new URL(trimmed)
  url.search = ''
  url.hash = ''
  return `${url.origin}${url.pathname.replace(/\/+$/, '')}`
}

/**
 * Resolve the active bundle. `override` wins (a course-scoped setting, once one
 * exists), then the deploy-time env var, then the bundled copy.
 */
export function resolveTextbookSource(override = null) {
  const remote = normalizeTextbookBaseUrl(override) || normalizeTextbookBaseUrl(env.VITE_TEXTBOOK_BASE_URL)
  if (remote) {
    return { kind: 'remote', baseUrl: remote, isRemote: true }
  }
  return { kind: 'local', baseUrl: LOCAL_TEXTBOOK_BASE, isRemote: false }
}

/** Join a bundle-relative path onto a base, leaving absolute paths alone. */
export function textbookFileUrl(baseUrl, relPath) {
  const base = String(baseUrl || LOCAL_TEXTBOOK_BASE).replace(/\/+$/, '')
  const rel = String(relPath || '').replace(/^\.\//, '').replace(/^\/+/, '')
  return rel ? `${base}/${rel}` : base
}

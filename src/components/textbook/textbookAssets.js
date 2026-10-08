import { getTextbookManifest } from './textbookCatalog.js'

const STYLE_ATTR = 'data-hula-textbook-style'

// Keyed by href, not a single promise, so swapping in a remote catalog loads
// that bundle's stylesheets instead of reusing the first resolved set.
const loadedStyles = new Map()

function ensureStylesheet(href) {
  const cached = loadedStyles.get(href)
  if (cached) return cached

  const existing = document.querySelector(`link[${STYLE_ATTR}="${CSS.escape(href)}"]`)
  if (existing) {
    const resolved = Promise.resolve()
    loadedStyles.set(href, resolved)
    return resolved
  }

  const pending = new Promise((resolve, reject) => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = href
    link.setAttribute(STYLE_ATTR, href)
    link.onload = () => resolve()
    link.onerror = () => {
      loadedStyles.delete(href)
      link.remove()
      reject(new Error(`Failed to load textbook stylesheet: ${href}`))
    }
    document.head.appendChild(link)
  })

  loadedStyles.set(href, pending)
  return pending
}

/**
 * Load LaTeXML / forall x / Fitch CSS for the active bundle.
 * Skips GitBook chrome CSS so it cannot break the HuLA shell.
 */
export function ensureTextbookStyles() {
  const { stylesheets = [] } = getTextbookManifest()
  return Promise.all(
    stylesheets.map((href) =>
      // Allow reading without styles rather than hard-failing the chapter.
      ensureStylesheet(href).catch((error) => console.warn(error)),
    ),
  )
}

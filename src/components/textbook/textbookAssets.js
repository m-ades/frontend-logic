import { getTextbookManifest } from './textbookCatalog.js'

const STYLE_ATTR = 'data-hula-textbook-style'

let stylesPromise = null

function ensureStylesheet(href) {
  const existing = document.querySelector(`link[${STYLE_ATTR}="${href}"]`)
  if (existing) return Promise.resolve()

  return new Promise((resolve, reject) => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = href
    link.setAttribute(STYLE_ATTR, href)
    link.onload = () => resolve()
    link.onerror = () => reject(new Error(`Failed to load textbook stylesheet: ${href}`))
    document.head.appendChild(link)
  })
}

/**
 * Load LaTeXML / forall x / Fitch CSS once for the session.
 * Skips GitBook chrome CSS so it cannot break the HuLA shell.
 */
export function ensureTextbookStyles() {
  if (stylesPromise) return stylesPromise

  const { stylesheets = [] } = getTextbookManifest()
  stylesPromise = Promise.all(stylesheets.map((href) => ensureStylesheet(href))).catch((error) => {
    // Allow reading without styles rather than hard-failing the chapter.
    console.warn(error)
  })

  return stylesPromise
}

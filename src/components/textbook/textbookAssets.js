import { getTextbookManifest } from './textbookCatalog.js'

const STYLE_ATTR = 'data-hula-textbook-style'
const MATHJAX_ATTR = 'data-hula-textbook-mathjax'

let stylesPromise = null
let mathJaxPromise = null

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

function loadScript(src, { id, force = false } = {}) {
  const existing = id ? document.getElementById(id) : document.querySelector(`script[src="${src}"]`)
  if (existing && !force) {
    return existing.dataset.loaded === 'true'
      ? Promise.resolve()
      : new Promise((resolve, reject) => {
          existing.addEventListener('load', () => resolve())
          existing.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)))
        })
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = src
    script.async = true
    if (id) script.id = id
    script.setAttribute(MATHJAX_ATTR, 'true')
    script.onload = () => {
      script.dataset.loaded = 'true'
      resolve()
    }
    script.onerror = () => reject(new Error(`Failed to load ${src}`))
    document.head.appendChild(script)
  })
}

/**
 * BookML's mathjax4.js configures MathJax then pulls the CDN build.
 * Requires network the first time.
 */
export function ensureTextbookMathJax() {
  if (mathJaxPromise) return mathJaxPromise

  const { mathJaxSrc } = getTextbookManifest()
  if (!mathJaxSrc) {
    mathJaxPromise = Promise.resolve()
    return mathJaxPromise
  }

  mathJaxPromise = loadScript(mathJaxSrc, { id: 'hula-textbook-mathjax' }).catch((error) => {
    console.warn('MathJax failed to load; math may render as raw MathML.', error)
  })

  return mathJaxPromise
}

export async function typesetTextbookMath(container) {
  if (!container || typeof window === 'undefined') return

  await ensureTextbookMathJax()

  const mathJax = window.MathJax
  if (!mathJax) return

  try {
    if (mathJax.startup?.promise) {
      await mathJax.startup.promise
    }
    if (typeof mathJax.typesetClear === 'function') {
      mathJax.typesetClear([container])
    }
    if (typeof mathJax.typesetPromise === 'function') {
      await mathJax.typesetPromise([container])
    }
  } catch (error) {
    console.warn('MathJax typeset failed', error)
  }
}

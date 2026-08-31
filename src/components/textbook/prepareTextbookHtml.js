/**
 * Prepare forall x: Calgary BookML/SCORM HTML for HuLA's TextbookReader.
 * Raw pages are full GitBook shells; we keep only the chapter body.
 */

const ASSET_BASE = '/textbook'

const TEXTBOOK_HTML_FILE = /^[A-Za-z0-9][A-Za-z0-9_-]*\.html(?:#.*)?$/i

function stripScripts(html) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<script\b[^>]*\/>/gi, '')
}

/**
 * Extract the readable body from a BookML page.
 * Prefers #bml-main-content section(s); falls back to body.
 */
export function extractTextbookBody(fullHtml) {
  if (typeof fullHtml !== 'string' || !fullHtml.trim()) return ''

  const parser = new DOMParser()
  const doc = parser.parseFromString(fullHtml, 'text/html')

  const main = doc.getElementById('bml-main-content')
  let root = main

  if (main) {
    // Drop gitbook bootstrap scripts that live inside main before the section.
    main.querySelectorAll('script').forEach((node) => node.remove())

    // Prefer the first LaTeXML content section / document root.
    const section =
      main.querySelector(
        'section.ltx_chapter, section.ltx_part, section.ltx_appendix, section.ltx_document, section.ltx_paragraph',
      ) || main.querySelector('section, .section.level0, .section.level1')

    if (section) root = section
  } else {
    root = doc.body
    if (root) root.querySelectorAll('script').forEach((node) => node.remove())
  }

  if (!root) {
    // Last resort: regex slice (older / broken markup)
    const match = fullHtml.match(
      /id=["']bml-main-content["'][^>]*>([\s\S]*?)(?:<nav class=["']ltx_page_footer|class=["']navigation navigation-prev|<\/body>)/i,
    )
    return stripScripts(match?.[1] || fullHtml)
  }

  // Remove in-page gitbook prev/next chevrons (HuLA supplies its own nav).
  root.querySelectorAll('a.navigation').forEach((node) => node.remove())

  return root.innerHTML
}

/**
 * Rewrite relative asset/page URLs so they resolve under /textbook and
 * in-app routes for chapter hops.
 */
export function rewriteTextbookUrls(html, { linkBase = '/student/textbook' } = {}) {
  if (typeof html !== 'string') return ''

  const parser = new DOMParser()
  const doc = parser.parseFromString(`<div id="__hula_root">${html}</div>`, 'text/html')
  const root = doc.getElementById('__hula_root')
  if (!root) return html

  root.querySelectorAll('[href]').forEach((el) => {
    const href = el.getAttribute('href')
    if (href == null) return
    const next = rewriteHref(href, linkBase)
    if (next !== href) el.setAttribute('href', next)
    if (next.startsWith('http://') || next.startsWith('https://') || next.startsWith('mailto:')) {
      el.setAttribute('target', '_blank')
      el.setAttribute('rel', 'noopener noreferrer')
    }
  })

  root.querySelectorAll('[src]').forEach((el) => {
    const src = el.getAttribute('src')
    if (src == null) return
    const next = rewriteAssetSrc(src)
    if (next !== src) el.setAttribute('src', next)
  })

  // poster / data attributes that may hold relative paths
  root.querySelectorAll('[data-src]').forEach((el) => {
    const src = el.getAttribute('data-src')
    if (!src) return
    el.setAttribute('data-src', rewriteAssetSrc(src))
  })

  return root.innerHTML
}

export function rewriteHref(href, linkBase) {
  const trimmed = href.trim()
  if (!trimmed || trimmed === '#') return trimmed

  // Already absolute app/textbook/hash/protocol
  if (
    trimmed.startsWith('#') ||
    trimmed.startsWith('/student/') ||
    trimmed.startsWith('/sandbox/') ||
    trimmed.startsWith('/textbook/') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('mailto:') ||
    trimmed.startsWith('tel:') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('javascript:')
  ) {
    return trimmed
  }

  // Chapter HTML → SPA route (preserve hash)
  const htmlMatch = trimmed.match(/^([^?#]+\.html)([?#].*)?$/i)
  if (htmlMatch && TEXTBOOK_HTML_FILE.test(htmlMatch[1].replace(/^\.\//, ''))) {
    const file = htmlMatch[1].replace(/^\.\//, '')
    const slug = file.replace(/\.html$/i, '')
    const suffix = htmlMatch[2] || ''
    return `${linkBase}/${slug}${suffix}`
  }

  // Bare relative asset (pdf, png, …)
  return rewriteAssetSrc(trimmed)
}

export function rewriteAssetSrc(src) {
  const trimmed = src.trim()
  if (
    !trimmed ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('/')
  ) {
    return trimmed
  }
  const cleaned = trimmed.replace(/^\.\//, '')
  return `${ASSET_BASE}/${cleaned}`
}

/**
 * Mark "Practice exercises" sections so html-react-parser can inject widgets.
 * Idempotent: skips sections that already have a practice widget marker.
 *
 * @deprecated Prefer metadata links via textbookPracticeLinks — HTML markers
 * are wiped when instructors re-export from LaTeX. Kept for manual authoring.
 */
export function injectPracticeWidgetSlots(html, slug) {
  if (typeof html !== 'string' || !slug) return html

  const parser = new DOMParser()
  const doc = parser.parseFromString(`<div id="__hula_root">${html}</div>`, 'text/html')
  const root = doc.getElementById('__hula_root')
  if (!root) return html

  const headings = root.querySelectorAll('h2, h3')
  let practiceIndex = 0

  headings.forEach((heading) => {
    const text = (heading.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase()
    if (!text.includes('practice exercise')) return

    const section = heading.closest('section') || heading.parentElement
    if (!section) return
    if (section.querySelector('[data-practice-widget-id]')) return

    practiceIndex += 1
    const slot = doc.createElement('div')
    slot.setAttribute(
      'data-practice-widget-id',
      `${slug}-practice-${String(practiceIndex).padStart(2, '0')}`,
    )
    slot.setAttribute('class', 'hula-practice-slot')
    slot.setAttribute('role', 'region')
    slot.setAttribute('aria-label', 'HuLA practice widget')
    const sectionRoot = heading.closest('section') || heading.parentElement
    sectionRoot?.appendChild(slot)
  })

  return root.innerHTML
}

/**
 * Full pipeline: extract → rewrite URLs.
 * Practice widgets are attached via course link metadata (not HTML slots).
 */
export function prepareTextbookHtml(fullHtml, { linkBase = '/student/textbook' } = {}) {
  const body = extractTextbookBody(fullHtml)
  return rewriteTextbookUrls(body, { linkBase })
}

export { ASSET_BASE }

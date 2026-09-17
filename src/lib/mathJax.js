import mathJaxUrl from 'mathjax/es5/tex-mml-svg.js?url'
import mathJaxSafeUrl from 'mathjax/es5/ui/safe.js?url'

let readyPromise
let typesetQueue = Promise.resolve()

function isMathJaxReady() {
  return typeof window !== 'undefined'
    && window.MathJax?.__lpSafeConfigured === true
    && typeof window.MathJax.typesetPromise === 'function'
}

// owns the safe mathjax runtime and serializes typesetting
export function ensureMathJax() {
  if (isMathJaxReady()) return Promise.resolve(window.MathJax)
  if (readyPromise) return readyPromise
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.reject(new Error('MathJax requires a browser'))
  }
  if (window.MathJax?.__lpSafeConfigured && window.MathJax.startup?.promise) {
    readyPromise = window.MathJax.startup.promise.then(() => window.MathJax)
    return readyPromise
  }
  if (window.MathJax) {
    return Promise.reject(new Error('MathJax was configured outside the shared runtime'))
  }

  window.MathJax = {
    __lpSafeConfigured: true,
    loader: {
      load: ['ui/safe'],
      source: { 'ui/safe': mathJaxSafeUrl },
    },
    options: {
      enableMenu: false,
      safeOptions: {
        allow: { URLs: 'none' },
      },
    },
    tex: {
      autoload: { html: [] },
    },
    svg: {
      fontCache: 'local',
      merrorInheritFont: true,
    },
    startup: { typeset: false },
  }

  readyPromise = new Promise((resolve, reject) => {
    const preload = document.createElement('link')
    preload.rel = 'preload'
    preload.as = 'script'
    preload.href = mathJaxSafeUrl
    document.head.appendChild(preload)

    const script = document.createElement('script')
    script.id = 'hula-mathjax'
    script.src = mathJaxUrl
    script.async = true
    script.onload = () => window.MathJax.startup.promise.then(() => resolve(window.MathJax), reject)
    script.onerror = () => reject(new Error('MathJax failed to load'))
    document.head.appendChild(script)
  })

  return readyPromise
}

/*
disconnected elements and aborted requests are skipped before mutation
aborting releases retained math after active work finishes
failures reject the request without blocking later work
*/
function queueTypeset(elements, prepare, signal) {
  const requested = (elements || []).filter(Boolean)
  typesetQueue = typesetQueue.catch(() => {}).then(async () => {
    if (signal?.aborted || !requested.some((element) => element.isConnected)) return
    const mathJax = await ensureMathJax()
    if (signal?.aborted) return
    const connected = requested.filter((element) => element.isConnected)
    if (!connected.length) return

    const clear = () => mathJax.typesetClear?.(connected)
    clear()
    try {
      prepare?.()
      await mathJax.typesetPromise(connected)
    } catch (error) {
      clear()
      throw error
    }

    const removed = connected.filter((element) => signal?.aborted || !element.isConnected)
    if (removed.length) mathJax.typesetClear?.(removed)
    if (signal && !signal.aborted) {
      signal.addEventListener('abort', () => {
        typesetQueue = typesetQueue.catch(() => {}).then(clear)
      }, { once: true })
    }
  })
  return typesetQueue
}

export function typesetMath(elements, { signal } = {}) {
  return queueTypeset(elements, undefined, signal)
}

export function typesetTex(element, tex, display = true, { signal } = {}) {
  return queueTypeset([element], () => {
    element.textContent = display ? `\\[${tex}\\]` : `\\(${tex}\\)`
  }, signal)
}

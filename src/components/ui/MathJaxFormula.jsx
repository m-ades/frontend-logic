import { useEffect, useRef, useState } from 'react'
import mathJaxUrl from 'mathjax/es5/tex-svg.js?url'
import mathJaxSafeUrl from 'mathjax/es5/ui/safe.js?url'
import './MathJaxFormula.css'

let mathJaxReady
let typesetQueue = Promise.resolve()

// the mathjax contract is that it may format tex but must not emit author controlled urls
function loadMathJax() {
  if (window.MathJax?.__lpSafeConfigured) return Promise.resolve(window.MathJax)
  if (mathJaxReady) return mathJaxReady

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
    svg: { fontCache: 'local' },
    startup: { typeset: false },
  }
  mathJaxReady = new Promise((resolve, reject) => {
    const preload = document.createElement('link')
    preload.rel = 'preload'
    preload.as = 'script'
    preload.href = mathJaxSafeUrl
    document.head.appendChild(preload)

    const script = document.createElement('script')
    script.src = mathJaxUrl
    script.async = true
    script.onload = () => window.MathJax.startup.promise.then(() => resolve(window.MathJax), reject)
    script.onerror = () => reject(new Error('MathJax failed to load'))
    document.head.appendChild(script)
  })
  return mathJaxReady
}

// renders tex with a plain text fallback while mathjax loads
// display mode selects block or inline math delimiters
// block controls layout independently from delimiter mode
// block formulas use intrinsic svg height without baseline overflow
export default function MathJaxFormula({ tex, fallback, display = true, block = display }) {
  const containerRef = useRef(null)
  const [ready, setReady] = useState(Boolean(window.MathJax?.__lpSafeConfigured))

  useEffect(() => {
    let cancelled = false
    loadMathJax().then(() => {
      if (!cancelled) setReady(true)
    }).catch(() => {})
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!ready || !containerRef.current) return undefined
    const element = containerRef.current
    let cancelled = false
    typesetQueue = typesetQueue.catch(() => {}).then(async () => {
      if (cancelled || !element.isConnected) return
      window.MathJax.typesetClear?.([element])
      element.textContent = display ? `\\[${tex}\\]` : `\\(${tex}\\)`
      await window.MathJax.typesetPromise([element])
    }).catch(() => {
      if (!cancelled && element.isConnected) element.textContent = fallback
    })
    return () => { cancelled = true }
  }, [display, fallback, ready, tex])

  return (
    <span
      ref={containerRef}
      aria-label={fallback}
      className={block ? 'mathjax-formula-block' : undefined}
    >
      {fallback}
    </span>
  )
}

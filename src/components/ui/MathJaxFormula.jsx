import { useEffect, useRef, useState } from 'react'
import mathJaxUrl from 'mathjax/es5/tex-svg.js?url'

let mathJaxReady
let typesetQueue = Promise.resolve()

function loadMathJax() {
  if (window.MathJax?.typesetPromise) return Promise.resolve(window.MathJax)
  if (mathJaxReady) return mathJaxReady

  window.MathJax = {
    options: { enableMenu: false },
    svg: { fontCache: 'local' },
    startup: { typeset: false },
  }
  mathJaxReady = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = mathJaxUrl
    script.async = true
    script.onload = () => window.MathJax.startup.promise.then(() => resolve(window.MathJax), reject)
    script.onerror = () => reject(new Error('MathJax failed to load'))
    document.head.appendChild(script)
  })
  return mathJaxReady
}

export default function MathJaxFormula({ tex, fallback }) {
  const containerRef = useRef(null)
  const [ready, setReady] = useState(Boolean(window.MathJax?.typesetPromise))

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
      element.textContent = `\\[${tex}\\]`
      await window.MathJax.typesetPromise([element])
    }).catch(() => {
      if (!cancelled && element.isConnected) element.textContent = fallback
    })
    return () => { cancelled = true }
  }, [fallback, ready, tex])

  return <span ref={containerRef} aria-label={fallback}>{fallback}</span>
}

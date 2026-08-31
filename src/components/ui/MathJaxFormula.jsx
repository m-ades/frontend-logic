import { useEffect, useRef } from 'react'
import { typesetTex } from '@/lib/mathJax.js'
import './MathJaxFormula.css'

export default function MathJaxFormula({ tex, fallback, display = true, block = display }) {
  const containerRef = useRef(null)

  useEffect(() => {
    if (!containerRef.current) return undefined
    const element = containerRef.current
    let cancelled = false

    typesetTex(element, tex, display).catch(() => {
      if (!cancelled && element.isConnected) element.textContent = fallback
    })
    return () => { cancelled = true }
  }, [display, fallback, tex])

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

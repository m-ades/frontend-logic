import { useEffect, useRef } from 'react'
import { typesetTex } from '@/lib/mathJax.js'
import './MathJaxFormula.css'

export default function MathJaxFormula({ tex, fallback, display = true, block = display }) {
  const containerRef = useRef(null)

  useEffect(() => {
    if (!containerRef.current) return undefined
    const element = containerRef.current
    const controller = new AbortController()

    typesetTex(element, tex, display, { signal: controller.signal }).catch(() => {
      if (!controller.signal.aborted && element.isConnected) element.textContent = fallback
    })
    return () => controller.abort()
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

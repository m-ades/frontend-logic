import { useCallback, useEffect, useRef, useState } from 'react'

// provides bounded resizing for a vertical separator

export function useHorizontalResize({
  initialValue,
  minValue,
  maxValue,
  step,
  largeStep,
  valueFromClientX,
  disabled = false,
}) {
  const clamp = useCallback(
    (value) => Math.min(maxValue, Math.max(minValue, value)),
    [minValue, maxValue],
  )
  const [value, setValue] = useState(() => {
    const resolved = typeof initialValue === 'function' ? initialValue() : initialValue
    return clamp(resolved)
  })
  const targetRef = useRef(null)
  const draggingRef = useRef(false)
  const priorBodyStyleRef = useRef(null)

  const updateFromClientX = useCallback(
    (clientX) => {
      const element = targetRef.current
      if (!element) return

      const next = valueFromClientX(clientX, element.getBoundingClientRect())
      if (!Number.isFinite(next)) return
      setValue(clamp(next))
    },
    [clamp, valueFromClientX],
  )

  const stopResize = useCallback(() => {
    if (!draggingRef.current) return
    draggingRef.current = false

    if (typeof document !== 'undefined') {
      const priorStyle = priorBodyStyleRef.current
      document.body.style.cursor = priorStyle?.cursor ?? ''
      document.body.style.userSelect = priorStyle?.userSelect ?? ''
    }
    priorBodyStyleRef.current = null
  }, [])

  useEffect(() => {
    const onPointerMove = (event) => {
      if (!draggingRef.current || disabled) return
      event.preventDefault()
      updateFromClientX(event.clientX)
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', stopResize)
    window.addEventListener('pointercancel', stopResize)

    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', stopResize)
      window.removeEventListener('pointercancel', stopResize)
      stopResize()
    }
  }, [disabled, stopResize, updateFromClientX])

  const onPointerDown = useCallback(
    (event) => {
      if (disabled) return
      event.preventDefault()
      draggingRef.current = true

      if (typeof document !== 'undefined') {
        priorBodyStyleRef.current = {
          cursor: document.body.style.cursor,
          userSelect: document.body.style.userSelect,
        }
        document.body.style.cursor = 'col-resize'
        document.body.style.userSelect = 'none'
      }
      updateFromClientX(event.clientX)
    },
    [disabled, updateFromClientX],
  )

  const onKeyDown = useCallback(
    (event) => {
      if (disabled) return
      const delta = event.shiftKey ? largeStep : step

      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        setValue((current) => clamp(current - delta))
      } else if (event.key === 'ArrowRight') {
        event.preventDefault()
        setValue((current) => clamp(current + delta))
      } else if (event.key === 'Home') {
        event.preventDefault()
        setValue(minValue)
      } else if (event.key === 'End') {
        event.preventDefault()
        setValue(maxValue)
      }
    },
    [clamp, disabled, largeStep, maxValue, minValue, step],
  )

  return {
    value,
    targetRef,
    separatorProps: {
      role: 'separator',
      'aria-orientation': 'vertical',
      'aria-valuenow': Math.round(value),
      'aria-valuemin': minValue,
      'aria-valuemax': maxValue,
      tabIndex: 0,
      onPointerDown,
      onKeyDown,
    },
  }
}

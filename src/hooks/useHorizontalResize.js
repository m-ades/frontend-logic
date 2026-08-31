import { useCallback, useEffect, useRef, useState } from 'react'

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
  const animationFrameRef = useRef(null)
  const pendingClientXRef = useRef(null)

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

  const cancelScheduledUpdate = useCallback(() => {
    if (animationFrameRef.current != null && typeof window !== 'undefined') {
      window.cancelAnimationFrame(animationFrameRef.current)
    }
    animationFrameRef.current = null
    pendingClientXRef.current = null
  }, [])

  const scheduleUpdate = useCallback((clientX) => {
    pendingClientXRef.current = clientX
    if (animationFrameRef.current != null) return

    animationFrameRef.current = window.requestAnimationFrame(() => {
      animationFrameRef.current = null
      const pendingClientX = pendingClientXRef.current
      pendingClientXRef.current = null
      if (!draggingRef.current || disabled || pendingClientX == null) return
      updateFromClientX(pendingClientX)
    })
  }, [disabled, updateFromClientX])

  const stopResize = useCallback((finalClientX) => {
    if (!draggingRef.current) return
    cancelScheduledUpdate()
    if (!disabled && Number.isFinite(finalClientX)) {
      updateFromClientX(finalClientX)
    }
    draggingRef.current = false

    if (typeof document !== 'undefined') {
      const priorStyle = priorBodyStyleRef.current
      document.body.style.cursor = priorStyle?.cursor ?? ''
      document.body.style.userSelect = priorStyle?.userSelect ?? ''
    }
    priorBodyStyleRef.current = null
  }, [cancelScheduledUpdate, disabled, updateFromClientX])

  useEffect(() => {
    const onPointerMove = (event) => {
      if (!draggingRef.current || disabled) return
      event.preventDefault()
      scheduleUpdate(event.clientX) // one render per animation frame
    }

    const onPointerUp = (event) => stopResize(event.clientX) // preserve final pointer position
    const onPointerCancel = () => stopResize()

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerCancel)

    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerCancel)
      stopResize()
    }
  }, [disabled, scheduleUpdate, stopResize])

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

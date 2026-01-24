import { useEffect, useRef, useMemo } from "react"
import "../../lib/logicpenguin/problemtypes/derivation-hurley.js"

export default function LogicPenguinProof({ premises, conclusion, questionId, savedState, onStateChange, onAttempt, attemptCount, attemptLimit }) {
  const ref = useRef(null)
  const hasAppliedSavedStateRef = useRef(false)
  const saveTimerRef = useRef(null)
  const lastSavedStateRef = useRef(null)

  const problemKey = useMemo(
    () => `${premises.join(",")}|${conclusion}`,
    [premises, conclusion]
  )

  useEffect(() => {
    const el = ref.current
    if (!el) return
    hasAppliedSavedStateRef.current = false
    lastSavedStateRef.current = null

    const needsPred = /[∃∀]|[a-z]/.test([...premises, conclusion].join(" "))
    const problem = { prems: premises, conc: conclusion }

    const loadProblem = () => {
      if (typeof el.loadProblem !== "function") return
      el.loadProblem(problem, { pred: needsPred, identity: false })
      if (savedState && typeof el.setStateSnapshot === "function") {
        el.setStateSnapshot(savedState)
        hasAppliedSavedStateRef.current = true
        try {
          lastSavedStateRef.current = JSON.stringify(savedState)
        } catch (err) {
          // ignore
        }
      }
    }

    if (el.isLPReady) {
      loadProblem()
      return
    }

    const handleReady = () => loadProblem()
    el.addEventListener("LP-ready", handleReady)
    return () => el.removeEventListener("LP-ready", handleReady)
  }, [problemKey, premises, conclusion])

  useEffect(() => {
    const el = ref.current
    if (!el || !savedState) return
    let serialized = null
    try {
      serialized = JSON.stringify(savedState)
    } catch (err) {
      // ignore
    }
    if (serialized && lastSavedStateRef.current === serialized) return
    if (hasAppliedSavedStateRef.current) return
    if (typeof el.setStateSnapshot === "function") {
      el.setStateSnapshot(savedState)
      hasAppliedSavedStateRef.current = true
      if (serialized) {
        lastSavedStateRef.current = serialized
      }
    }
  }, [savedState, problemKey])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof attemptCount === 'number') {
      el.attemptCount = attemptCount
    }
    if (typeof attemptLimit === 'number') {
      el.attemptLimit = attemptLimit
    }
    if (el.checksaveButton && typeof el.attemptLimit === 'number' && typeof el.attemptCount === 'number') {
      el.checksaveButton.disabled = el.attemptCount >= el.attemptLimit
    }
  }, [attemptCount, attemptLimit])

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const handleAttempt = (event) => {
      onAttempt?.(event?.detail)
      if (onStateChange && event?.detail?.state) {
        try {
          const serialized = JSON.stringify(event.detail.state)
          if (lastSavedStateRef.current !== serialized) {
            lastSavedStateRef.current = serialized
            onStateChange(event.detail.state)
          }
        } catch (err) {
          // ignore
        }
      }
      if (typeof window !== 'undefined' && event?.detail?.assignmentQuestionId) {
        window.dispatchEvent(new CustomEvent('assignment-submission', {
          detail: event.detail,
        }))
      }
    }

    el.addEventListener('lp-submission', handleAttempt)
    return () => {
      el.removeEventListener('lp-submission', handleAttempt)
    }
  }, [onAttempt, onStateChange])

  useEffect(() => {
    const el = ref.current
    if (!el || !onStateChange) return

    const emitStateIfChanged = () => {
      try {
        const nextState = el.getState()
        const nextSerialized = JSON.stringify(nextState)
        if (lastSavedStateRef.current === nextSerialized) {
          return
        }
        lastSavedStateRef.current = nextSerialized
        onStateChange(nextState)
      } catch (err) {
        // ignore
      }
    }

    const handleFocusOut = (event) => {
      const target = event.target
      if (!target?.classList) return
      if (!target.classList.contains('formulainput') && !target.classList.contains('justification')) {
        return
      }
      if (typeof el.getState === 'function' && !el._isRestoring) {
        emitStateIfChanged()
      }
    }

    const scheduleStateSave = () => {
      if (el._isRestoring) return
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
      }
      saveTimerRef.current = setTimeout(() => {
        emitStateIfChanged()
      }, 200)
    }

    const handleInputChange = (event) => {
      const target = event.target
      if (!target?.classList) return
      if (!target.classList.contains('formulainput') && !target.classList.contains('justification')) {
        return
      }
      scheduleStateSave()
    }

    el.addEventListener('focusout', handleFocusOut, true)
    el.addEventListener('input', handleInputChange, true)
    el.addEventListener('change', handleInputChange, true)
    return () => {
      el.removeEventListener('focusout', handleFocusOut, true)
      el.removeEventListener('input', handleInputChange, true)
      el.removeEventListener('change', handleInputChange, true)
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
        saveTimerRef.current = null
      }
    }
  }, [onStateChange])

  return (
    <div className="logicpenguin" style={{ width: "100%", overflowX: "auto", minWidth: 0 }}>
      <derivation-hurley
        ref={ref}
        data-assignment-question-id={questionId ?? ''}
        style={{ display: "block", width: "100%", maxWidth: "100%" }}
      />
    </div>
  )
}

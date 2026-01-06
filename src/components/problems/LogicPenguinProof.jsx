import { useEffect, useRef, useMemo } from "react"
import "../../lib/logicpenguin/problemtypes/derivation-hurley.js"

export default function LogicPenguinProof({ premises, conclusion, questionId, savedState, onStateChange, onAttempt, attemptCount, attemptLimit }) {
  const ref = useRef(null)

  const problemKey = useMemo(
    () => `${premises.join(",")}|${conclusion}`,
    [premises, conclusion]
  )

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const needsPred = /[∃∀]|[a-z]/.test([...premises, conclusion].join(" "))
    const problem = { prems: premises, conc: conclusion }

    const loadProblem = () => {
      if (typeof el.loadProblem !== "function") return
      el.loadProblem(problem, { pred: needsPred, identity: false })
      if (savedState && typeof el.setStateSnapshot === "function") {
        el.setStateSnapshot(savedState)
      }
    }

    if (el.isLPReady) {
      loadProblem()
      return
    }

    const handleReady = () => loadProblem()
    el.addEventListener("LP-ready", handleReady)
    return () => el.removeEventListener("LP-ready", handleReady)
  }, [problemKey, savedState, premises, conclusion])

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
    if (!el || !onAttempt) return

    const handleAttempt = (event) => {
      onAttempt(event?.detail)
    }

    el.addEventListener('lp-submission', handleAttempt)
    return () => {
      el.removeEventListener('lp-submission', handleAttempt)
    }
  }, [onAttempt])

  useEffect(() => {
    const el = ref.current
    if (!el || !onStateChange) return

    const handleFocusOut = (event) => {
      const target = event.target
      if (!target?.classList) return
      if (!target.classList.contains('formulainput') && !target.classList.contains('justification')) {
        return
      }
      if (typeof el.getState === 'function' && !el._isRestoring) {
        try {
          onStateChange(el.getState())
        } catch (err) {
          // ignore
        }
      }
    }

    el.addEventListener('focusout', handleFocusOut, true)
    return () => {
      el.removeEventListener('focusout', handleFocusOut, true)
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

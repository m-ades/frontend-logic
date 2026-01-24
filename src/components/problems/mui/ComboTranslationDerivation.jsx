import { useEffect, useMemo, useRef, useState } from 'react'
import { Alert, Box, Stack, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import ProblemSetButtons from './ProblemSetButtons.jsx'
import FormulaInput from '../../ui/logicpenguin/formula-input.js'
import LogicPenguinProof from '../LogicPenguinProof.jsx'
import getFormulaClass from '../../../lib/logicpenguin/symbolic/formula.js'
import { useProblemChecker } from '../../../hooks/useProblemChecker.js'
import RichText from '../../ui/RichText.jsx'

const parseArgumentLine = (line) => {
  if (!line || typeof line !== 'string') {
    return { error: 'Enter the argument as a single line.' }
  }
  const parts = line.split('//')
  if (parts.length !== 2) {
    return { error: 'Use "//" to separate premises from the conclusion.' }
  }
  const premisesPart = parts[0].trim()
  const conclusion = parts[1].trim()
  if (!premisesPart) {
    return { error: 'Enter at least one premise before "//".' }
  }
  if (!conclusion) {
    return { error: 'Enter a conclusion after "//".' }
  }
  const premises = premisesPart
    .split('/')
    .map((premise) => premise.trim())
    .filter(Boolean)
  if (premises.length === 0) {
    return { error: 'Enter at least one premise before "//".' }
  }
  return { premises, conclusion }
}

const normalizeProof = (proofLike) => {
  if (!proofLike) return null
  if (proofLike.ans) return proofLike.ans
  return proofLike
}

export default function ComboTranslationDerivation({
  proof,
  onStateChange,
  onComplete,
  savedState,
  assignmentQuestionId,
  attemptLimit,
}) {
  const theme = useTheme()
  const Formula = useMemo(() => getFormulaClass(), [])
  const snapshot = proof?.comboTranslationDerivation || proof?.snapshot || {}
  const promptText = snapshot?.prompt || proof?.description || ''
  const [argumentLine, setArgumentLine] = useState(savedState?.argumentLine ?? '')
  const [derivationState, setDerivationState] = useState(savedState?.derivationState ?? null)
  const inputRef = useRef(null)
  const proofWrapperRef = useRef(null)

  useEffect(() => {
    if (savedState?.argumentLine !== undefined) {
      setArgumentLine(savedState.argumentLine)
    }
  }, [savedState?.argumentLine])

  useEffect(() => {
    if (savedState?.derivationState) {
      setDerivationState(savedState.derivationState)
    }
  }, [savedState?.derivationState])

  const updateState = (updates) => {
    const state = { argumentLine, derivationState, ...updates }
    onStateChange?.(state)
  }

  const parseStatus = useMemo(() => {
    if (!argumentLine) {
      return { ok: false, reason: '', parsed: null }
    }
    const parsed = parseArgumentLine(argumentLine)
    if (parsed.error) {
      return { ok: false, reason: parsed.error, parsed: null }
    }
    try {
      parsed.premises.forEach((premise) => Formula.from(premise))
      Formula.from(parsed.conclusion)
      return { ok: true, reason: '', parsed }
    } catch {
      return { ok: false, reason: 'Fix the argument line before starting the derivation.', parsed: null }
    }
  }, [Formula, argumentLine])

  const derivationProblem = useMemo(() => {
    if (!parseStatus.ok || !parseStatus.parsed) return null
    return {
      premises: parseStatus.parsed.premises,
      conclusion: parseStatus.parsed.conclusion,
    }
  }, [parseStatus.ok, parseStatus.parsed])

  const getDerivationElement = () =>
    proofWrapperRef.current?.querySelector('derivation-hurley') || null

  useEffect(() => {
    const derivEl = getDerivationElement()
    if (!derivEl) return
    const hideButtons = () => {
      const btnDiv = derivEl.querySelector('.buttondiv')
      if (btnDiv) {
        btnDiv.style.display = 'none'
      }
    }
    hideButtons()
    derivEl.addEventListener('LP-ready', hideButtons)
    return () => {
      derivEl.removeEventListener('LP-ready', hideButtons)
    }
  }, [argumentLine, derivationProblem?.conclusion, derivationProblem?.premises?.join(',')])

  const getProofAnswer = () => {
    const derivEl = getDerivationElement()
    if (derivEl?.getAnswer) {
      try {
        return derivEl.getAnswer()
      } catch {
        // ignore
      }
    }
    if (derivationState?.ans) return derivationState.ans
    if (derivationState) return derivationState
    return null
  }

  const resetInputs = () => {
    setArgumentLine('')
    setDerivationState(null)
    const derivEl = getDerivationElement()
    if (derivEl?.startOver) {
      try {
        derivEl.startOver()
      } catch {
        // ignore
      }
    }
    if (inputRef.current) {
      inputRef.current.value = ''
    }
    updateState({ argumentLine: '', derivationState: null })
  }

  const { message, isChecking, handleCheck, handleStartOver, getStatusColor, setMessage, attemptCount, maxAttempts, isLocked } =
    useProblemChecker({
      answer: proof?.answer ?? snapshot?.answer,
      problemType: 'combo-translation-derivation',
      question: snapshot,
      options: proof?.options ?? snapshot?.options,
      getAnswer: () => ({
        argumentLine,
        proof: normalizeProof(getProofAnswer()),
        derivationState: derivationState ?? undefined,
      }),
      onComplete,
      isDisabled: () => !parseStatus.ok,
      resetInput: resetInputs,
      onStateChange: updateState,
      assignmentQuestionId,
      attemptLimit,
      initialAttemptCount: savedState?.attemptCount ?? 0,
    })

  const handleArgumentChange = (value) => {
    setArgumentLine(value)
    setDerivationState(null)
    updateState({ argumentLine: value, derivationState: null })
  }

  return (
    <Stack spacing={3} sx={{ px: 0, width: '100%' }}>
      <Box className="logicpenguin" sx={{ width: '100%' }}>
        <Box className="lp-problem-card">
          <Stack spacing={3} sx={{ p: { xs: 2, md: 2 } }}>
            {promptText && (
              <RichText content={promptText} variant="body1" sx={{ fontSize: '1rem' }} />
            )}
            <Typography variant="body2" color="text.secondary">
              Enter the argument as a single line, then build a derivation for it.
            </Typography>
            <Box>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>
                Argument line
              </Typography>
              <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary', fontSize: '0.875rem' }}>
                Use "/" for separate premises and "//" for the conclusion. Example: A ⊃ B / A // B.
              </Typography>
              <Box
                ref={(el) => {
                  if (!el) return
                  if (!inputRef.current) {
                    const input = FormulaInput.getnew({})
                    inputRef.current = input
                    Object.assign(input.style, {
                      width: '100%',
                      padding: theme.spacing(1.5),
                      border: `1px solid ${theme.palette.divider}`,
                      borderRadius: theme.shape.borderRadius,
                      fontSize: '1rem',
                      fontFamily: 'monospace',
                      backgroundColor: theme.palette.background.paper,
                      color: theme.palette.text.primary,
                    })
                    input.value = argumentLine ?? ''
                    input.addEventListener('input', () => handleArgumentChange(input.value))
                    el.appendChild(input)
                  } else {
                    if (!el.contains(inputRef.current)) el.appendChild(inputRef.current)
                    inputRef.current.value = argumentLine ?? ''
                  }
                }}
                sx={{ width: '100%', minHeight: '56px' }}
              />
            </Box>

            {parseStatus.ok && derivationProblem && (
              <Box
                ref={proofWrapperRef}
                sx={{
                  '& derivation-hurley .buttondiv': { display: 'none' },
                  '& derivation-hurley': { width: '100%' },
                }}
              >
                <LogicPenguinProof
                  key={argumentLine}
                  premises={derivationProblem.premises}
                  conclusion={derivationProblem.conclusion}
                  questionId={proof?.questionId}
                  savedState={derivationState}
                  onStateChange={(state) => {
                    setDerivationState(state)
                    updateState({ derivationState: state })
                  }}
                  attemptLimit={attemptLimit}
                />
              </Box>
            )}
          </Stack>
        </Box>
      </Box>

      {!parseStatus.ok && parseStatus.reason && (
        <Alert severity="info">{parseStatus.reason}</Alert>
      )}

      {message && <Alert severity={getStatusColor()} onClose={() => setMessage('')}>{message}</Alert>}

      <ProblemSetButtons
        onCheck={handleCheck}
        onStartOver={handleStartOver}
        isChecking={isChecking}
        isDisabled={!parseStatus.ok || isLocked}
        align="flex-start"
        attemptCount={attemptCount}
        attemptLimit={maxAttempts}
      />
    </Stack>
  )
}

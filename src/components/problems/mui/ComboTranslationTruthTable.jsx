import { useEffect, useMemo, useRef, useState } from 'react'
import { Box, Stack, Typography, Tooltip } from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import InstructorQuestionEditor from '../InstructorQuestionEditor.jsx'
import StatusBanner, { isTerminalStatus } from '../../ui/StatusBanner.jsx'
import { useTheme, useMediaQuery } from '@mui/material'
import getSyntax from '../../../lib/logicpenguin/symbolic/libsyntax.js'
import ProblemSetButtons from './ProblemSetButtons.jsx'
import FormulaInput from '../../ui/logicpenguin/formula-input.js'
import SymbolButtonRow from '../../ui/logicpenguin/SymbolButtonRow.jsx'
import { MobileLogicInput } from '../../ui/LogicKeyboard/index.js'
import TruthTableEditor from '../TruthTableEditor.jsx'
import getFormulaClass from '../../../lib/logicpenguin/symbolic/formula.js'
import { useProblemChecker } from '../../../hooks/useProblemChecker.js'
import PromptText from '../../ui/PromptText.jsx'

/** Extract symbolization key lines from prompt text (e.g. "E = ...\\nL = ..."). Used for mobile keyboard variable letters. */
function parseSymbolizationKeyFromPrompt(promptText) {
  if (!promptText || typeof promptText !== 'string') return []
  return promptText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^[A-Za-z]+\s*=/.test(line))
}

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

const buildTableAnswer = (tableState) => {
  if (!tableState?.tables?.length) return null
  const toBool = (cell) => cell === 'T'
  const mapRows = (rows) => rows.map((row) => row.map(toBool))
  const mapped = tableState.tables.map((t) => ({
    rows: mapRows(t.rows || []),
    colhls: t.rows?.[0]?.length ? Array(t.rows[0].length).fill(false) : [],
  }))
  if (mapped.length === 1) return { lefts: [], right: mapped[0], rowhls: [] }
  const payload = {
    lefts: mapped.slice(0, -1),
    right: mapped[mapped.length - 1],
    rowhls: [],
    mcans: tableState.mcans ?? [],
    valid: tableState.mcans?.includes('valid'),
  }
  return payload
}

const isTableComplete = (tableState) =>
  tableState?.tables?.every((t) =>
    t.rows?.every((row) => row?.every((cell) => cell !== ''))
  ) ?? false

// combo argument table: require valid/invalid selection
const hasClassification = (tableState) =>
  Array.isArray(tableState?.mcans) && tableState.mcans.length > 0

// Resolve expected argument (premises + conclusion) from snapshot/answer for solution reveal
function resolveExpectedAnswer(answer) {
  if (!answer) return null
  if (answer.argument || answer.argumentLine) {
    const parsed = parseArgumentLine(answer.argument ?? answer.argumentLine)
    return parsed.error ? null : parsed
  }
  if (Array.isArray(answer.premises) && answer.conclusion != null) {
    return { premises: answer.premises, conclusion: answer.conclusion }
  }
  if (Array.isArray(answer.translations) && Number.isInteger(answer.index)) {
    const conclusion = answer.translations[answer.index] ?? ''
    const premises = answer.translations.filter((_, idx) => idx !== answer.index)
    return premises.length && conclusion ? { premises, conclusion } : null
  }
  return null
}

export default function ComboTranslationTruthTable({
  proof,
  onStateChange,
  onComplete,
  savedState,
  assignmentQuestionId,
  attemptLimit,
  isAssignmentLocked = false,
  isInstructorView = false,
  onQuestionSaved,
}) {
  const theme = useTheme()
  const isPhone = useMediaQuery(theme.breakpoints.down('sm'))
  const editorRef = useRef(null)
  const openEdit = () => editorRef.current?.open?.()
  const Formula = useMemo(() => getFormulaClass(), [])
  const syntax = useMemo(() => getSyntax(), [])
  const snapshot = proof?.comboTranslationTruthTable || proof?.snapshot || {}
  const promptText = snapshot?.prompt || proof?.description || ''
  const symbolizationKey = useMemo(
    () => parseSymbolizationKeyFromPrompt(promptText),
    [promptText]
  )
  const [argumentLine, setArgumentLine] = useState(savedState?.argumentLine ?? '')
  const [tableState, setTableState] = useState(savedState?.tableState ?? null)
  const inputRef = useRef(null)
  const inputContainerRef = useRef(null)

  useEffect(() => {
    if (isPhone) return
    const container = inputContainerRef.current
    if (!container) return
    const inp = FormulaInput.getnew({})
    inputRef.current = inp
    Object.assign(inp.style, {
      width: '100%',
      padding: theme.spacing(1.5),
      border: `1px solid ${theme.palette.divider}`,
      borderRadius: theme.shape.borderRadius,
      fontSize: '1rem',
      fontFamily: 'monospace',
      backgroundColor: theme.palette.background.paper,
      color: theme.palette.text.primary,
    })
    container.appendChild(inp)
    inp.value = argumentLine ?? ''
    const onInput = () => {
      setArgumentLine(inp.value)
      setTableState(null)
      updateState({ argumentLine: inp.value, tableState: null })
    }
    inp.addEventListener('input', onInput)
    inp.addEventListener('change', onInput)
    return () => {
      inp.removeEventListener('input', onInput)
      inp.removeEventListener('change', onInput)
      if (inp.parentNode) inp.parentNode.removeChild(inp)
      inputRef.current = null
    }
  }, [theme, isPhone])

  useEffect(() => {
    if (isPhone) return
    const inp = inputRef.current
    if (!inp || argumentLine === undefined || inp.value === argumentLine) return
    if (document.activeElement === inp) return
    inp.value = argumentLine
  }, [argumentLine, isPhone])

  useEffect(() => {
    if (savedState?.argumentLine !== undefined) {
      setArgumentLine(savedState.argumentLine)
    }
  }, [savedState?.argumentLine])

  const updateState = (updates) => {
    const state = { argumentLine, tableState, ...updates }
    onStateChange?.(state)
  }

  const parseStatus = useMemo(() => {
    if (!argumentLine) {
      return { ok: false, reason: '', parsed: null }
    }
    const quantSymbols = [syntax?.symbols?.FORALL, syntax?.symbols?.EXISTS].filter(Boolean)
    if (quantSymbols.length > 0) {
      const quantRegex = new RegExp(`[${quantSymbols.join('')}]`)
      if (quantRegex.test(argumentLine)) {
        return {
          ok: false,
          reason: 'Truth tables do not support quantifiers.',
          parsed: null,
        }
      }
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
      return { ok: false, reason: 'Fix the argument line before building the table.', parsed: null }
    }
  }, [Formula, argumentLine])

  const tableProof = useMemo(() => {
    if (!parseStatus.ok || !parseStatus.parsed) return null
    return {
      ...proof,
      truthTable: {
        kind: 'argument',
        lefts: parseStatus.parsed.premises,
        right: parseStatus.parsed.conclusion,
        options: { question: true },
      },
    }
  }, [parseStatus.ok, parseStatus.parsed, proof])

  const expectedAnswer = useMemo(
    () => resolveExpectedAnswer(proof?.answer ?? snapshot?.answer),
    [proof?.answer, snapshot?.answer]
  )
  const answerProof = useMemo(() => {
    if (!expectedAnswer) return null
    return {
      ...proof,
      id: proof?.id ? `${proof.id}-answer` : 'answer',
      truthTable: {
        kind: 'argument',
        lefts: expectedAnswer.premises,
        right: expectedAnswer.conclusion,
        options: { question: true },
      },
    }
  }, [expectedAnswer, proof])

  const problemChecker = useProblemChecker({
    answer: proof?.answer ?? snapshot?.answer,
    problemType: 'combo-translation-truth-table',
    question: snapshot,
    options: proof?.options ?? snapshot?.options,
    getAnswer: () => {
      const payload = { argumentLine }
      const built = buildTableAnswer(tableState)
      if (built) payload.tableAns = built
      if (tableState && typeof tableState === 'object') payload.tableState = tableState
      return payload
    },
    onComplete,
    isDisabled: () =>
      !parseStatus.ok ||
      !tableState ||
      !isTableComplete(tableState) ||
      !hasClassification(tableState),
    resetInput: () => {
      setArgumentLine('')
      setTableState(null)
      if (inputRef.current) inputRef.current.value = ''
      updateState({ argumentLine: '', tableState: null })
    },
    onStateChange: updateState,
    assignmentQuestionId,
    attemptLimit,
    initialAttemptCount: savedState?.attemptCount ?? 0,
  })

  const status = problemChecker.status
  const message = problemChecker.message
  const isChecking = problemChecker.isChecking
  const handleCheck = problemChecker.handleCheck
  const handleStartOver = problemChecker.handleStartOver
  const setMessage = problemChecker.setMessage
  const attemptCount = problemChecker.attemptCount
  const maxAttempts = problemChecker.maxAttempts
  const isLocked = problemChecker.isLocked

  const showSolution = attemptCount >= maxAttempts && status !== 'correct' && expectedAnswer != null
  const answerArgumentLine = expectedAnswer
    ? expectedAnswer.premises.join(' / ') + ' // ' + expectedAnswer.conclusion
    : ''

  const handleArgumentChange = (value) => {
    setArgumentLine(value)
    setTableState(null)
    updateState({ argumentLine: value, tableState: null })
  }

  return (
    <Stack spacing={3} sx={{ px: 0, width: '100%' }}>
      <Box className="logicpenguin" sx={{ width: '100%' }}>
        <Box className="lp-problem-card">
          <Stack spacing={3} sx={{ p: { xs: 2, md: 2 } }}>
            {isInstructorView && proof && (
              <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Tooltip title="Edit prompt">
                  <Box component="span" onClick={openEdit} role="button" aria-label="Edit question" sx={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer', color: 'text.secondary', '&:hover': { opacity: 0.8 } }}>
                    <EditIcon fontSize="small" />
                  </Box>
                </Tooltip>
              </Box>
            )}
            {promptText && (
              <PromptText content={promptText} sx={{ whiteSpace: 'pre-line' }} />
            )}
            <Typography variant="body2" color="text.secondary">
              Enter the argument as a single line, then complete the truth table and classify it.
            </Typography>
            <Box>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>
                Argument line
              </Typography>
              {isPhone ? (
                <MobileLogicInput
                  value={argumentLine}
                  onChange={handleArgumentChange}
                  placeholder="e.g. P ⊃ Q / P // Q"
                  aria-label="Argument line"
                  symbolizationKey={symbolizationKey}
                  includeQuantifiers={false}
                  extraInsertButtons={[{ insert: '/' }, { insert: '//' }]}
                />
              ) : (
                <>
                  <Box
                    ref={inputContainerRef}
                    sx={{ width: '100%', minHeight: 56, display: 'flex', alignItems: 'center' }}
                  />
                  <Box sx={{ mt: 1 }}>
                    <SymbolButtonRow
                      inputRef={inputRef}
                      onValueChange={handleArgumentChange}
                      includeQuantifiers={false}
                    />
                  </Box>
                </>
              )}
            </Box>
            {parseStatus.ok && tableProof && (
              <TruthTableEditor
                key={argumentLine}
                proof={tableProof}
                savedState={tableState}
                onStateChange={(next) => {
                  setTableState(next)
                  updateState({ tableState: next })
                }}
                hideActions
                suppressReveal={status === 'correct' || attemptCount < maxAttempts || showSolution}
                embedded
                parentStatus={status}
                parentAttemptCount={attemptCount}
                parentAttemptLimit={maxAttempts}
              />
            )}
          </Stack>
        </Box>
      </Box>

      {isTerminalStatus(status) && (
        <StatusBanner
          status={status}
          message={message}
          onClose={() => setMessage('')}
        />
      )}

      {showSolution && answerProof && (
        <Box className="logicpenguin" sx={{ width: '100%' }}>
          <Box className="lp-problem-card" sx={{ borderColor: 'primary.main', borderWidth: 1, borderStyle: 'solid' }}>
            <Stack spacing={2} sx={{ p: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, color: 'primary.main' }}>
                Correct Answer
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Argument line
              </Typography>
              <Typography component="div" sx={{ fontFamily: 'monospace', fontSize: '1rem' }}>
                {answerArgumentLine}
              </Typography>
              <TruthTableEditor
                proof={answerProof}
                savedState={null}
                hideActions
                suppressReveal={false}
                embedded
                solutionOnly
                parentStatus={status}
                parentAttemptCount={attemptCount}
                parentAttemptLimit={maxAttempts}
              />
            </Stack>
          </Box>
        </Box>
      )}

      <ProblemSetButtons
        onCheck={handleCheck}
        onStartOver={handleStartOver}
        isChecking={isChecking}
        isDisabled={
          !parseStatus.ok ||
          !tableState ||
          !isTableComplete(tableState) ||
          !hasClassification(tableState) ||
          isLocked ||
          isAssignmentLocked
        }
        align="flex-start"
        attemptCount={attemptCount}
        attemptLimit={maxAttempts}
        isInstructorView={isInstructorView}
      />
      {isInstructorView && proof && (
        <InstructorQuestionEditor ref={editorRef} proof={proof} isInstructorView onSaved={onQuestionSaved} trigger="none" />
      )}
    </Stack>
  )
}

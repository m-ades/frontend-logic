import { useEffect, useMemo, useRef, useState } from 'react'
import { Box, Stack, Typography } from '@mui/material'
import StatusBanner, { isTerminalStatus } from '../../ui/StatusBanner.jsx'
import { useTheme } from '@mui/material/styles'
import getSyntax from '../../../lib/logicpenguin/symbolic/libsyntax.js'
import ProblemSetButtons from './ProblemSetButtons.jsx'
import FormulaInput from '../../ui/logicpenguin/formula-input.js'
import SymbolButtonRow from '../../ui/logicpenguin/SymbolButtonRow.jsx'
import TruthTableEditor from '../TruthTableEditor.jsx'
import getFormulaClass from '../../../lib/logicpenguin/symbolic/formula.js'
import { useProblemChecker } from '../../../hooks/useProblemChecker.js'
import PromptText from '../../ui/PromptText.jsx'

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

export default function ComboTranslationTruthTable({
  proof,
  onStateChange,
  onComplete,
  savedState,
  assignmentQuestionId,
  attemptLimit,
}) {
  const theme = useTheme()
  const Formula = useMemo(() => getFormulaClass(), [])
  const syntax = useMemo(() => getSyntax(), [])
  const snapshot = proof?.comboTranslationTruthTable || proof?.snapshot || {}
  const promptText = snapshot?.prompt || proof?.description || ''
  const [argumentLine, setArgumentLine] = useState(savedState?.argumentLine ?? '')
  const [tableState, setTableState] = useState(savedState?.tableState ?? null)
  const inputRef = useRef(null)

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

  const { status, message, isChecking, handleCheck, handleStartOver, setMessage, attemptCount, maxAttempts, isLocked } =
    useProblemChecker({
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
              <Box sx={{ mt: 1 }}>
                <SymbolButtonRow
                  inputRef={inputRef}
                  onValueChange={handleArgumentChange}
                  includeQuantifiers={false}
                />
              </Box>
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
                suppressReveal={status === 'correct' || attemptCount < maxAttempts}
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

      <ProblemSetButtons
        onCheck={handleCheck}
        onStartOver={handleStartOver}
        isChecking={isChecking}
        isDisabled={
          !parseStatus.ok ||
          !tableState ||
          !isTableComplete(tableState) ||
          !hasClassification(tableState) ||
          isLocked
        }
        align="flex-start"
        attemptCount={attemptCount}
        attemptLimit={maxAttempts}
      />
    </Stack>
  )
}

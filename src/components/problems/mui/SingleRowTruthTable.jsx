import { useEffect, useMemo, useState } from 'react'
import { Alert, Box, Stack, Typography } from '@mui/material'
import getFormulaClass from '../../../lib/logicpenguin/symbolic/formula.js'
import getSyntax from '../../../lib/logicpenguin/symbolic/libsyntax.js'
import { libtf } from '../../../lib/logicpenguin/symbolic/libsemantics.js'
import ProblemSetButtons from './ProblemSetButtons.jsx'
import { useProblemChecker } from '../../../hooks/useProblemChecker.js'

function TruthToggle({ value, onChange, ariaLabel, accent, readOnly = false }) {
  const cycleValue = (current) => {
    if (!current) return 'T'
    if (current === 'T') return 'F'
    return ''
  }

  const handleClick = () => {
    if (readOnly) return
    onChange(cycleValue(value))
  }

  return (
    <Box
      className="tt-toggle"
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      onClick={handleClick}
      onKeyDown={(event) => {
        if (readOnly) return
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onChange(cycleValue(value))
        }
      }}
      sx={{
        fontSize: '0.85rem',
        fontWeight: 700,
        color: value === 'T' ? (accent ? '#1e55ff' : '#2f6bff')
          : value === 'F'
            ? '#b22'
            : accent ? '#2f6bff' : 'rgba(0, 0, 0, 0.25)',
        cursor: 'pointer',
        textTransform: 'uppercase',
        letterSpacing: '0.12em',
        width: 28,
        height: 28,
        display: 'inline-flex',
        justifyContent: 'center',
        alignItems: 'center',
        border: 'none',
        backgroundColor: 'transparent',
        transition: 'color 0.15s ease',
        '&:hover': {
          color: '#2f6bff',
        },
        '&:focus-visible': {
          outline: '2px solid rgba(47, 107, 255, 0.6)',
          outlineOffset: 2,
        },
      }}
    >
      {value || '-'}
    </Box>
  )
}

const toSymbol = (value) => {
  if (value === true || value === 'T' || value === 't' || value === 1) return 'T'
  if (value === false || value === 'F' || value === 'f' || value === 0) return 'F'
  return ''
}
const toBoolean = (value) => (value === 'T' ? true : value === 'F' ? false : null)

export default function SingleRowTruthTable({
  problem,
  onStateChange,
  onComplete,
  savedState,
  assignmentQuestionId,
  attemptLimit,
  readOnly = false,
  hideActions = false,
}) {
  const syntax = useMemo(() => getSyntax(), [])
  const Formula = useMemo(() => getFormulaClass(), [])
  const statement = problem?.statement || problem?.prompt || ''
  const prompt = problem?.prompt && problem?.prompt !== statement ? problem.prompt : ''
  const interpretation = problem?.interpretation || {}
  const operatorSet = useMemo(() => new Set(Object.keys(syntax.operators)), [syntax])

  const evaluation = useMemo(() => {
    if (!statement) return null
    const wff = Formula.from(statement)
    const evalWithTokens = (formula, interp) => {
      const tfn = formula.op ? libtf.tfns[syntax.operators[formula.op]] : false
      const isBinary = syntax.isbinaryop(formula.op)
      const isMono = syntax.ismonop(formula.op)

      if (!isBinary && !isMono) {
        const tv = formula.op ? tfn() : (interp[formula.pletter] ?? false)
        return { tv, row: [tv], tokens: [formula.normal] }
      }

      if (isBinary) {
        const lres = evalWithTokens(formula.left, interp)
        const rres = evalWithTokens(formula.right, interp)
        const tv = tfn(lres.tv, rres.tv)
        return {
          tv,
          row: [...lres.row, tv, ...rres.row],
          tokens: [...lres.tokens, formula.op, ...rres.tokens],
        }
      }

      const rres = evalWithTokens(formula.right, interp)
      const tv = tfn(rres.tv)
      return { tv, row: [tv, ...rres.row], tokens: [formula.op, ...rres.tokens] }
    }

    return evalWithTokens(wff, interpretation)
  }, [Formula, interpretation, statement, syntax])

  const tokens = evaluation?.tokens || []
  const expectedRow = (evaluation?.row || []).map(toSymbol)

  const isAtomicToken = (token) => {
    if (!token) return false
    const stripped = token.replace(/[()\[\]{}]/g, '')
    if (stripped.length !== 1) return false
    return !operatorSet.has(stripped)
  }

  const buildInitialRow = () =>
    tokens.map((token, idx) => {
      if (isAtomicToken(token)) {
        return toSymbol(interpretation?.[token])
      }
      if (savedState?.row?.[idx] !== undefined) {
        return savedState.row[idx]
      }
      return ''
    })
  const buildResetRow = () =>
    tokens.map((token) => (isAtomicToken(token) ? toSymbol(interpretation?.[token]) : ''))

  const [rowInputs, setRowInputs] = useState(buildInitialRow)

  useEffect(() => {
    setRowInputs(buildInitialRow())
  }, [savedState, tokens, statement, interpretation])

  const isDisabled = () =>
    rowInputs.length === 0 ||
    rowInputs.some((cell, idx) => cell === '' && !isAtomicToken(tokens[idx]))

  const { status, message, isChecking, handleCheck, handleStartOver, getStatusColor, setStatus, setMessage, isLocked } = useProblemChecker({
    answer: expectedRow,
    problemType: 'single-row-truth-table',
    question: problem,
    getAnswer: () => ({
      row: rowInputs.map(toBoolean),
    }),
    onComplete,
    isDisabled,
    resetInput: () => {
      const reset = buildResetRow()
      setRowInputs(reset)
      onStateChange?.({ row: reset })
    },
    onStateChange,
    assignmentQuestionId,
    attemptLimit,
    initialAttemptCount: savedState?.attemptCount ?? 0,
  })

  const handleCellChange = (index, value) => {
    if (readOnly || isLocked) return
    if (isAtomicToken(tokens[index])) return
    setRowInputs((prev) => {
      const next = [...prev]
      next[index] = value
      onStateChange?.({ row: next })
      return next
    })
    setStatus('unanswered')
    setMessage('')
  }

  const formatInterpretation = () => {
    const entries = Object.entries(interpretation)
    if (!entries.length) return ''
    return entries
      .map(([key, value]) => `${key} = ${value ? 'T' : 'F'}`)
      .join(', ')
  }

  const renderTableSet = (rowsToRender, rowInputsToRender, readOnlyTable) => (
    <Box className="tt-table-wrap">
      <Box component="table" className="tt-table">
        <Box component="thead" className="tt-head">
          <Box component="tr" className="tt-token-row">
            {tokens.map((token, idx) => (
              <Box component="th" key={`single-row-header-${idx}`} className="tt-token">
                {token}
              </Box>
            ))}
          </Box>
        </Box>
        <Box component="tbody">
          {rowsToRender.map((row, rowIndex) => (
            <Box component="tr" key={`single-row-${rowIndex}`} className="tt-row">
              {row.map((_, colIndex) => (
                <Box component="td" key={`single-row-cell-${rowIndex}-${colIndex}`} className="tt-cell">
                  <TruthToggle
                    value={rowInputsToRender[rowIndex]?.[colIndex]}
                    onChange={(value) => handleCellChange(colIndex, value)}
                    ariaLabel={`Answer row ${rowIndex + 1} col ${colIndex + 1}`}
                    accent={false}
                    readOnly={
                      readOnlyTable ||
                      readOnly ||
                      isLocked ||
                      isAtomicToken(tokens[colIndex])
                    }
                  />
                </Box>
              ))}
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  )

  const renderAnswerCard = (title, body) => (
    <Box className="logicpenguin" sx={{ width: '100%', flexGrow: 1 }}>
      <Box
        sx={{
          mt: 1,
          overflow: 'visible',
          minHeight: '260px',
          flexGrow: 1,
          alignSelf: { xs: 'stretch', md: 'flex-start' },
        }}
        className="lp-problem-card"
      >
        <Stack spacing={3} sx={{ p: { xs: 2, md: 2 } }}>
          <Typography variant="h6" sx={{ fontWeight: 600, color: '#2f6bff' }}>
            {title}
          </Typography>
          {body}
        </Stack>
      </Box>
    </Box>
  )

  if (!statement) {
    return <Typography color="error">Invalid problem</Typography>
  }

  const tableRows = [rowInputs]
  const tableFilled = rowInputs.length > 0 && !isDisabled()

  return (
    <Stack spacing={2} sx={{ px: 0, width: '100%', alignItems: 'stretch', flexGrow: 1 }}>
      <Typography variant="h5" sx={{ fontWeight: 600, color: '#2f6bff' }}>
        Truth Table Task
      </Typography>
      {(prompt || statement) && (
        <Typography variant="body1" sx={{ fontSize: { xs: '0.95rem', md: '1rem' } }}>
          {prompt || statement}
        </Typography>
      )}
      <Typography variant="body2" sx={{ color: '#2f6bff' }}>
        Fill in the single row to match the expected truth values.
      </Typography>
      <Box className="logicpenguin" sx={{ width: '100%', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Box
          sx={{
            mt: 1,
            overflow: 'visible',
            minHeight: '260px',
            flexGrow: 1,
            alignSelf: { xs: 'stretch', md: 'flex-start' },
          }}
          className="lp-problem-card"
        >
          <Stack spacing={2} sx={{ p: { xs: 2, md: 2 } }}>
            {renderTableSet(tableRows, tableRows, false)}
          </Stack>
        </Box>
      </Box>

      {!hideActions && (
        <ProblemSetButtons
          onCheck={handleCheck}
          onStartOver={handleStartOver}
          isChecking={isChecking}
          isDisabled={!tableFilled || isLocked}
          align="flex-start"
          sx={{ mt: 1 }}
        />
      )}
      <Typography
        variant="body2"
        sx={{
          color: status === 'correct' ? '#76b947' : tableFilled ? '#d58b00' : '#2f6bff',
          fontWeight: tableFilled ? 600 : 500,
        }}
      >
        {status === 'correct'
          ? 'Row matches!'
          : tableFilled
            ? 'Row filled. Check your values.'
            : 'Complete every cell to finish.'}
      </Typography>
      {message && (
        <Alert
          severity={getStatusColor()}
          onClose={() => setMessage('')}
        >
          {message}
        </Alert>
      )}

      {isLocked && expectedRow.length > 0 && renderAnswerCard(
        'Correct Answer',
        renderTableSet([expectedRow], [expectedRow], true)
      )}
    </Stack>
  )
}

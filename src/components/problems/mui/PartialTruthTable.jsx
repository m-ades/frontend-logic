import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Stack,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Select,
  MenuItem,
} from '@mui/material'
import getFormulaClass from '../../../lib/logicpenguin/symbolic/formula.js'
import { multiTables } from '../../../lib/logicpenguin/symbolic/libsemantics.js'
import ProblemSetButtons from './ProblemSetButtons.jsx'
import { useProblemChecker } from '../../../hooks/useProblemChecker.js'
import RichText from '../../ui/RichText.jsx'

const toTruth = (value) => {
  if (value === true || value === 'T' || value === 't' || value === 1) return true
  if (value === false || value === 'F' || value === 'f' || value === 0) return false
  return null
}

const toSymbol = (value) => {
  if (value === true || value === 'T' || value === 't') return 'T'
  if (value === false || value === 'F' || value === 'f') return 'F'
  if (value === 'U' || value === 'u' || value === '?') return 'U'
  return ''
}

export default function PartialTruthTable({
  problem,
  onStateChange,
  onComplete,
  savedState,
  assignmentQuestionId,
  attemptLimit,
  readOnly = false,
  hideActions = false,
}) {
  const Formula = useMemo(() => getFormulaClass(), [])
  const statement = problem?.statement || problem?.formula || ''
  const prompt = problem?.prompt || ''
  const givenRow = Array.isArray(problem?.row) ? problem.row : []

  const tokens = useMemo(() => {
    if (!statement) return []
    const wff = Formula.from(statement)
    const tables = multiTables([wff])
    return tables?.tables?.[0]?.tokens ?? []
  }, [Formula, statement])

  const editableIndices = useMemo(
    () => tokens.map((_, idx) => toTruth(givenRow[idx]) === null),
    [givenRow, tokens]
  )

  const buildInitialRow = () =>
    tokens.map((_, idx) => {
      const given = toTruth(givenRow[idx])
      if (given !== null) {
        return toSymbol(givenRow[idx])
      }
      const saved = savedState?.row?.[idx]
      return saved ? toSymbol(saved) : ''
    })

  const [rowInputs, setRowInputs] = useState(buildInitialRow)

  useEffect(() => {
    setRowInputs(buildInitialRow())
  }, [savedState, tokens, statement, givenRow])

  const isDisabled = () =>
    rowInputs.length === 0 ||
    rowInputs.some((cell, idx) => editableIndices[idx] && cell === '')

  const { status, message, isChecking, handleCheck, handleStartOver, getStatusColor, setStatus, setMessage } = useProblemChecker({
    answer: null,
    problemType: 'partial-truth-table',
    question: problem,
    getAnswer: () => ({ row: rowInputs }),
    onComplete,
    isDisabled,
    resetInput: () => {
      const reset = buildInitialRow()
      setRowInputs(reset)
      onStateChange?.({ row: reset })
    },
    onStateChange,
    assignmentQuestionId,
    attemptLimit,
    initialAttemptCount: savedState?.attemptCount ?? 0,
  })

  const handleCellChange = (index, value) => {
    if (readOnly) return
    setRowInputs((prev) => {
      const next = [...prev]
      next[index] = value
      onStateChange?.({ row: next })
      return next
    })
    setStatus('unanswered')
    setMessage('')
  }

  return (
    <Stack spacing={2} sx={{ px: 0, width: '100%', alignItems: 'stretch', flexGrow: 1 }}>
      <Box className="logicpenguin" sx={{ width: '100%', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Box
          sx={{
            overflow: 'visible',
            minHeight: '200px',
            flexGrow: 1,
            alignSelf: { xs: 'stretch', md: 'flex-start' },
          }}
          className="lp-problem-card"
        >
          <Stack spacing={3} sx={{ p: { xs: 2, md: 2 } }}>
            {prompt && (
              <RichText content={prompt} variant="body1" sx={{ fontSize: { xs: '0.95rem', md: '1rem' } }} />
            )}
            {statement && (
              <RichText content={statement} variant="body2" color="text.secondary" />
            )}
            <TableContainer component={Paper} className="tt-table-wrap" elevation={0}>
              <Table className="tt-table">
                <TableHead className="tt-head">
                  <TableRow className="tt-token-row">
                    {tokens.map((token, idx) => (
                      <TableCell key={`partial-tt-token-${idx}`} className="tt-token" align="center">
                        {token}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow className="tt-row">
                    {tokens.map((_, idx) => {
                      const isEditable = editableIndices[idx]
                      const value = rowInputs[idx] ?? ''
                      return (
                        <TableCell key={`partial-tt-cell-${idx}`} className="tt-cell" align="center">
                          {isEditable ? (
                            <Select
                              value={value}
                              onChange={(event) => handleCellChange(idx, event.target.value)}
                              size="small"
                              displayEmpty
                              disabled={readOnly}
                              sx={{ minWidth: 64 }}
                            >
                              <MenuItem value="">
                                <em>?</em>
                              </MenuItem>
                              <MenuItem value="T">T</MenuItem>
                              <MenuItem value="F">F</MenuItem>
                              <MenuItem value="U">U</MenuItem>
                            </Select>
                          ) : (
                            <Typography sx={{ fontWeight: 700 }}>{value || toSymbol(givenRow[idx])}</Typography>
                          )}
                        </TableCell>
                      )
                    })}
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Stack>
        </Box>
      </Box>
      {message && (
        <Alert severity={getStatusColor()} onClose={() => setMessage('')}>
          {message}
        </Alert>
      )}
      {!hideActions && (
        <ProblemSetButtons
          onCheck={handleCheck}
          onStartOver={handleStartOver}
          isChecking={isChecking}
          isDisabled={isDisabled()}
          align="flex-start"
        />
      )}
    </Stack>
  )
}

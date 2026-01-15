import { useMemo, useState, useEffect } from 'react'
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
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  Button,
} from '@mui/material'
import getFormulaClass from '../../../lib/logicpenguin/symbolic/formula.js'
import getSyntax from '../../../lib/logicpenguin/symbolic/libsyntax.js'
import { multiTables } from '../../../lib/logicpenguin/symbolic/libsemantics.js'
import ProblemSetButtons from './ProblemSetButtons.jsx'
import { useProblemChecker } from '../../../hooks/useProblemChecker.js'

const toSymbol = (value) => {
  if (value === true || value === 'T' || value === 't' || value === 1) return 'T'
  if (value === false || value === 'F' || value === 'f' || value === 0) return 'F'
  return ''
}

function TruthToggle({ value, onChange, ariaLabel, readOnly = false }) {
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
        color: value === 'T' ? '#2f6bff'
          : value === 'F'
            ? '#b22'
            : 'rgba(0, 0, 0, 0.25)',
        cursor: readOnly ? 'default' : 'pointer',
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
          color: readOnly ? undefined : '#2f6bff',
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

const getArgumentLabels = (argument) => {
  const premises = Array.isArray(argument?.premises) ? argument.premises : []
  const conclusion = argument?.conclusion ? [argument.conclusion] : []
  return [...premises, ...conclusion]
}

const isStackedLayout = (layout) => {
  if (!layout) return true
  return ['stacked', 'argument-block', 'vertical', 'column', 'premises-first'].includes(layout)
}

export default function IndirectTruthTable({
  problem,
  answer,
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
  const prompt = problem?.prompt || ''
  const argument = problem?.argument || {}
  const choices = problem?.choices || []
  const layout = argument?.layout
  const labels = useMemo(() => getArgumentLabels(argument), [argument])
  const sandboxColumns = useMemo(() => {
    const tokenizeForHeader = (stmt) => {
      if (!stmt) return []
      let rstr = '[(\\[{]*'
      rstr += `[${syntax.notation.predicatesRange}`
      for (const o in syntax.operators) { rstr += o }
      rstr += `][${syntax.notation.constantsRange}${syntax.notation.variableRange}]*`
      rstr += '[)\\]}]*'
      const regex = new RegExp(rstr, 'g')
      return Array.from(stmt.replace(/\s/g, '').matchAll(regex)).map(
        (match) => match[0]
      )
    }
    const columns = []
    const totalPremises = argument?.premises?.length || 0
    const hasConclusion = Boolean(argument?.conclusion)
    const totalStatements = labels.length
    labels.forEach((statement, idx) => {
      let tokens = []
      try {
        if (statement) {
          const wff = Formula.from(statement)
          tokens = tokenizeForHeader(statement)
          if (!tokens.length) {
            tokens = multiTables([wff])?.tables?.[0]?.tokens ?? []
          }
        }
      } catch {
        tokens = []
      }
      if (!tokens.length) {
        tokens = statement ? [statement] : []
      }
      tokens.forEach((token) => columns.push({ token, separator: false }))
      if (idx < totalStatements - 1) {
        const isBeforeConclusion = hasConclusion && idx === totalPremises - 1
        columns.push({ token: isBeforeConclusion ? '//' : '/', separator: true })
      }
    })
    return columns
  }, [Formula, argument?.conclusion, argument?.premises, labels])
  const sandboxCellCount = useMemo(
    () => sandboxColumns.filter((col) => !col.separator).length,
    [sandboxColumns]
  )
  const defaultRow = useMemo(() => Array(sandboxCellCount).fill(''), [sandboxCellCount])

  const [selectedValue, setSelectedValue] = useState(
    savedState?.ans !== undefined ? String(savedState.ans) : ''
  )
  const [sandboxRows, setSandboxRows] = useState(() => {
    if (Array.isArray(savedState?.sandboxRows) && savedState.sandboxRows.length > 0) {
      return savedState.sandboxRows.map((row) =>
        defaultRow.map((_, idx) => toSymbol(row?.[idx]) || '')
      )
    }
    if (Array.isArray(savedState?.sandboxRow)) {
      return [defaultRow.map((_, idx) => toSymbol(savedState.sandboxRow[idx]) || '')]
    }
    return [defaultRow]
  })

  useEffect(() => {
    setSelectedValue(savedState?.ans !== undefined ? String(savedState.ans) : '')
  }, [savedState?.ans])

  useEffect(() => {
    if (Array.isArray(savedState?.sandboxRows) && savedState.sandboxRows.length > 0) {
      setSandboxRows(
        savedState.sandboxRows.map((row) =>
          defaultRow.map((_, idx) => toSymbol(row?.[idx]) || '')
        )
      )
      return
    }
    if (Array.isArray(savedState?.sandboxRow)) {
      setSandboxRows([defaultRow.map((_, idx) => toSymbol(savedState.sandboxRow[idx]) || '')])
    } else {
      setSandboxRows([defaultRow])
    }
  }, [defaultRow, savedState?.sandboxRow, savedState?.sandboxRows])

  const handleChoiceChange = (event) => {
    if (readOnly) return
    const nextValue = event.target.value
    setSelectedValue(nextValue)
    onStateChange?.({ ans: parseInt(nextValue), sandboxRows })
  }

  const handleSandboxChange = (rowIndex, colIndex, value) => {
    if (readOnly) return
    setSandboxRows((prev) => {
      const next = prev.map((row, idx) => (idx === rowIndex ? [...row] : row))
      next[rowIndex][colIndex] = value
      onStateChange?.({ ans: parseInt(selectedValue), sandboxRows: next })
      return next
    })
  }

  const handleAddRow = () => {
    if (readOnly) return
    setSandboxRows((prev) => {
      const next = [...prev, [...defaultRow]]
      onStateChange?.({ ans: parseInt(selectedValue), sandboxRows: next })
      return next
    })
  }

  const { message, isChecking, handleCheck, handleStartOver, getStatusColor, setMessage, isLocked } =
    useProblemChecker({
      answer,
      problemType: 'indirect-truth-table',
      question: problem,
      getAnswer: () => ({ ans: parseInt(selectedValue), sandboxRows }),
      onComplete,
      isDisabled: () => selectedValue === '',
      resetInput: () => {
        const reset = [labels.map((_, idx) => defaultRow[idx] ?? '')]
        setSelectedValue('')
        setSandboxRows(reset)
        onStateChange?.({ ans: '', sandboxRows: reset })
      },
      onStateChange,
      assignmentQuestionId,
      attemptLimit,
      initialAttemptCount: savedState?.attemptCount ?? 0,
    })

  return (
    <Stack spacing={3} sx={{ px: 0, width: '100%', alignItems: 'stretch', flexGrow: 1 }}>
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
              <Typography
                variant="body1"
                sx={{ fontSize: { xs: '0.95rem', md: '1rem' }, whiteSpace: 'pre-line' }}
              >
                {prompt}
              </Typography>
            )}

            {argument?.premises?.length > 0 && (
              <Box sx={{ width: '100%' }}>
                {isStackedLayout(layout) ? (
                  <Stack spacing={0.5} sx={{ fontSize: '1.1rem', fontFamily: 'monospace' }}>
                    {argument.premises.map((premise, idx) => (
                      <Typography key={`premise-${idx}`} sx={{ fontSize: '1.1rem' }}>
                        {premise}
                      </Typography>
                    ))}
                    {argument.conclusion && (
                      <>
                        <Box sx={{ borderTop: '1px solid rgba(0,0,0,0.65)', width: '140px', my: 0.5 }} />
                        <Typography sx={{ fontSize: '1.1rem' }}>
                          {argument.conclusion}
                        </Typography>
                      </>
                    )}
                  </Stack>
                ) : (
                  <Typography sx={{ fontSize: '1.1rem', fontFamily: 'monospace' }}>
                    {labels.join(' / ')}
                  </Typography>
                )}
              </Box>
            )}

            {sandboxColumns.length > 0 && (
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Sandbox (not graded)
                </Typography>
                <TableContainer component={Paper} className="tt-table-wrap" elevation={0}>
                  <Table className="tt-table">
                    <TableHead className="tt-head">
                      <TableRow className="tt-token-row">
                        {sandboxColumns.map((col, idx) => (
                          <TableCell
                            key={`itt-label-${idx}`}
                            className="tt-token"
                            align="center"
                            sx={col.separator ? { width: 18, px: 0 } : undefined}
                          >
                            {col.token}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {sandboxRows.map((row, rowIndex) => (
                        <TableRow key={`itt-row-${rowIndex}`} className="tt-row">
                          {sandboxColumns.map((col, idx) => {
                            if (col.separator) {
                              return (
                                <TableCell key={`itt-cell-${rowIndex}-${idx}`} className="tt-cell" align="center" />
                              )
                            }
                            const dataIndex = sandboxColumns
                              .slice(0, idx)
                              .filter((c) => !c.separator).length
                            return (
                              <TableCell key={`itt-cell-${rowIndex}-${idx}`} className="tt-cell" align="center">
                                <TruthToggle
                                  value={row?.[dataIndex] ?? ''}
                                  onChange={(value) => handleSandboxChange(rowIndex, dataIndex, value)}
                                  ariaLabel={`Sandbox row ${rowIndex + 1} col ${dataIndex + 1}`}
                                  readOnly={readOnly}
                                />
                              </TableCell>
                            )
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                  <Button size="small" variant="outlined" onClick={handleAddRow} disabled={readOnly}>
                    + Add row
                  </Button>
                </Box>
              </Box>
            )}

            <FormControl component="fieldset" sx={{ width: '100%' }}>
              <RadioGroup value={selectedValue} onChange={handleChoiceChange} name="indirect-truth-table-choice">
                {choices.map((choice, index) => (
                  <FormControlLabel
                    key={`${choice}-${index}`}
                    value={String(index)}
                    control={<Radio disabled={readOnly || isLocked} />}
                    label={choice}
                    sx={{
                      mb: 1,
                      '& .MuiFormControlLabel-label': { fontSize: '1rem' },
                    }}
                  />
                ))}
              </RadioGroup>
            </FormControl>
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
          isDisabled={selectedValue === '' || isLocked}
          align="flex-start"
        />
      )}
    </Stack>
  )
}

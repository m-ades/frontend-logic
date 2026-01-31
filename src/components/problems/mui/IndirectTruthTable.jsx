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
import { useTheme } from '@mui/material/styles'
import getFormulaClass from '../../../lib/logicpenguin/symbolic/formula.js'
import getSyntax from '../../../lib/logicpenguin/symbolic/libsyntax.js'
import { multiTables } from '../../../lib/logicpenguin/symbolic/libsemantics.js'
import ProblemSetButtons from './ProblemSetButtons.jsx'
import { useProblemChecker } from '../../../hooks/useProblemChecker.js'
import PromptText from '../../ui/PromptText.jsx'

const toSymbol = (value) => {
  if (value === true || value === 'T' || value === 't' || value === 1) return 'T'
  if (value === false || value === 'F' || value === 'f' || value === 0) return 'F'
  return ''
}

function TruthToggle({ value, onChange, ariaLabel, readOnly = false }) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  
  const cycleValue = (current) => {
    if (!current) return 'T'
    if (current === 'T') return 'F'
    return ''
  }

  const handleClick = () => {
    if (readOnly) return
    onChange(cycleValue(value))
  }

  const getColor = () => {
    if (value === 'T') return '#2f6bff'
    if (value === 'F') return '#b22'
    return isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.25)'
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
        fontWeight: 700,
        color: getColor(),
        cursor: readOnly ? 'default' : 'pointer',
        textTransform: 'uppercase',
        display: 'inline-flex',
        justifyContent: 'center',
        alignItems: 'center',
        border: 'none',
        backgroundColor: 'transparent',
        transition: 'color 0.15s ease',
        '&:hover': {
          color: readOnly ? undefined : (isDark ? '#7b93ff' : '#2f6bff'),
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
  const theme = useTheme()
  const syntax = useMemo(() => getSyntax(), [])
  const Formula = useMemo(() => getFormulaClass(), [])
  const prompt = problem?.prompt || ''
  const argument = problem?.argument || {}
  const mcQuestions = useMemo(() => {
    if (Array.isArray(problem?.questions) && problem.questions.length > 0) {
      return problem.questions
    }
    if (Array.isArray(problem?.choices) && problem.choices.length > 0) {
      return [{
        prompt: problem?.choicePrompt || '',
        choices: problem.choices,
        answerIndex: problem?.answerIndex ?? problem?.answer,
      }]
    }
    return []
  }, [problem?.answer, problem?.answerIndex, problem?.choicePrompt, problem?.choices, problem?.questions])
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

  const buildInitialSelections = () => {
    if (Array.isArray(savedState?.answers) && savedState.answers.length) {
      return mcQuestions.map((_, idx) => {
        const saved = savedState.answers[idx]
        return saved !== undefined && saved !== null ? String(saved) : ''
      })
    }
    if (savedState?.ans !== undefined && mcQuestions.length > 0) {
      return mcQuestions.map((_, idx) => (idx === 0 ? String(savedState.ans) : ''))
    }
    return mcQuestions.map(() => '')
  }

  const [selectedValues, setSelectedValues] = useState(buildInitialSelections)
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
    setSelectedValues(buildInitialSelections())
  }, [savedState?.ans, savedState?.answers, mcQuestions])

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

  const handleChoiceChange = (index, value) => {
    if (readOnly) return
    setSelectedValues((prev) => {
      const next = [...prev]
      next[index] = value
      const answers = next.map((val) => (val === '' ? '' : parseInt(val, 10)))
      onStateChange?.({ answers, ans: answers[0] ?? '', sandboxRows })
      return next
    })
  }

  const handleSandboxChange = (rowIndex, colIndex, value) => {
    if (readOnly) return
    setSandboxRows((prev) => {
      const next = prev.map((row, idx) => (idx === rowIndex ? [...row] : row))
      next[rowIndex][colIndex] = value
      const answers = selectedValues.map((val) => (val === '' ? '' : parseInt(val, 10)))
      onStateChange?.({ answers, ans: answers[0] ?? '', sandboxRows: next })
      return next
    })
  }

  const handleAddRow = () => {
    if (readOnly) return
    setSandboxRows((prev) => {
      const next = [...prev, [...defaultRow]]
      const answers = selectedValues.map((val) => (val === '' ? '' : parseInt(val, 10)))
      onStateChange?.({ answers, ans: answers[0] ?? '', sandboxRows: next })
      return next
    })
  }

  const { message, isChecking, handleCheck, handleStartOver, getStatusColor, setMessage, attemptCount, maxAttempts, isLocked } =
    useProblemChecker({
      answer,
      problemType: 'indirect-truth-table',
      question: problem,
      getAnswer: () => ({
        answers: selectedValues.map((val) => (val === '' ? '' : parseInt(val, 10))),
        ans: selectedValues[0] === '' ? '' : parseInt(selectedValues[0], 10),
        sandboxRows,
      }),
      onComplete,
      isDisabled: () => selectedValues.some((val) => val === '') || mcQuestions.length === 0,
      resetInput: () => {
        const reset = [[...defaultRow]]
        setSelectedValues(mcQuestions.map(() => ''))
        setSandboxRows(reset)
        onStateChange?.({ answers: mcQuestions.map(() => ''), ans: '', sandboxRows: reset })
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
              <PromptText content={prompt} />
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
                        <Box sx={{ borderTop: (theme) => `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.65)'}`, width: '140px', my: 0.5 }} />
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
                <Box className="tt-table-wrap">
                  <Box sx={{ width: 'max-content', minWidth: 'max-content', display: 'flex', flexDirection: 'column' }}>
                    <TableContainer 
                      component={Paper} 
                      elevation={0} 
                      sx={{ 
                        background: 'transparent', 
                        boxShadow: 'none !important',
                        '&.MuiPaper-root': {
                          boxShadow: 'none !important',
                        },
                        '& .MuiTable-root': {
                          background: 'transparent',
                          border: 'none',
                          boxShadow: 'none',
                        },
                        '& .MuiTableCell-root': {
                          color: 'text.primary',
                          borderColor: 'divider',
                        },
                        '& .MuiTableHead-root .MuiTableCell-root': {
                          backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : undefined,
                        },
                        '& .MuiTableRow-root:nth-of-type(even)': {
                          backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : undefined,
                        },
                      }}
                    >
                      <Table className="tt-table">
                        <TableHead className="tt-head">
                          <TableRow className="tt-token-row">
                            {sandboxColumns.map((col, idx) => (
                              <TableCell
                                key={`itt-label-${idx}`}
                                className="tt-token"
                                align="center"
                                sx={col.separator ? { width: 18, px: 0, background: 'transparent', color: 'text.secondary' } : undefined}
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
                                    <TableCell 
                                      key={`itt-cell-${rowIndex}-${idx}`} 
                                      className="tt-cell" 
                                      align="center"
                                      sx={{ background: 'transparent' }}
                                    />
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
                </Box>
              </Box>
            )}

            <FormControl component="fieldset" sx={{ width: '100%' }}>
              <Stack spacing={2}>
                {mcQuestions.map((mcq, qIdx) => (
                  <Box key={`itt-mc-${qIdx}`} sx={{ width: '100%' }}>
                    <PromptText content={mcq.prompt} sx={{ mb: 1, fontWeight: 500 }} />
                    <RadioGroup
                      value={selectedValues[qIdx] ?? ''}
                      onChange={(event) => handleChoiceChange(qIdx, event.target.value)}
                      name={`indirect-truth-table-choice-${qIdx}`}
                    >
                      {(mcq.choices || []).map((choice, index) => (
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
                  </Box>
                ))}
              </Stack>
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
          isDisabled={mcQuestions.length === 0 || selectedValues.some((val) => val === '') || isLocked}
          align="flex-start"
          attemptCount={attemptCount}
          attemptLimit={maxAttempts}
        />
      )}
    </Stack>
  )
}

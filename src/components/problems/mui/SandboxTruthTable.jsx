import { useMemo, useState, useEffect, useRef, useCallback } from 'react'
import {
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
  Tooltip,
  alpha,
} from '@mui/material'
import InstructorQuestionEditor from '../InstructorQuestionEditor.jsx'
import { useTheme } from '@mui/material/styles'
import ProblemSetButtons from './ProblemSetButtons.jsx'
import ProblemFrame, { choiceLabelWithGapSx, sectionLabelSx } from './ProblemFrame.jsx'
import { useProblemChecker } from '../../../hooks/useProblemChecker.js'
import SolutionReveal from '../SolutionReveal.jsx'
import PromptText from '../../ui/PromptText.jsx'
import { rowsEqual, matrixEqual, clearDebounce, scheduleDebouncedChange } from '../../../utils/tablePerf.js'
import { getTokenSpeechLabel } from '../../ui/logicpenguin/LogicSymbol.jsx'

const DEFAULT_TOGGLE = ['T', 'F']

// normalize truth value cycle
const normalizeToggleValues = (raw, fallback) => {
  const base = Array.isArray(fallback) && fallback.length ? fallback : DEFAULT_TOGGLE
  if (!Array.isArray(raw)) return base
  const cleaned = raw
    .map((v) => String(v || '').trim().toUpperCase())
    .filter(Boolean)
  return cleaned.length ? cleaned : base
}

// map any input to display token
const toSymbol = (value) => {
  if (value === true || value === 'T' || value === 't' || value === 1) return 'T'
  if (value === false || value === 'F' || value === 'f' || value === 0) return 'F'
  if (value == null) return ''
  return String(value).trim().toUpperCase()
}

function ColumnRowSelectorBox({ selected, onClick, ariaLabel, theme, tooltip }) {
  const primary = theme.palette.primary.main
  const borderColor = theme.palette.mode === 'dark'
    ? 'rgba(255, 255, 255, 0.3)'
    : 'rgba(0, 0, 0, 0.4)'
  return (
    <Tooltip title={tooltip || ''}>
      <Box
        role="button"
        tabIndex={0}
        aria-label={ariaLabel}
        onClick={onClick}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            onClick()
          }
        }}
        sx={{
          width: 14,
          height: 14,
          minWidth: 14,
          minHeight: 14,
          border: `2px solid ${borderColor}`,
          borderRadius: 0.5,
          bgcolor: selected ? alpha(primary, 0.4) : 'transparent',
          outline: selected ? `2px solid ${primary}` : 'none',
          outlineOffset: -1,
          cursor: 'pointer',
          '&:hover': {
            bgcolor: selected ? alpha(primary, 0.5) : alpha(primary, 0.12),
            borderColor: selected ? primary : borderColor,
          },
          '&:focus-visible': {
            outline: `2px solid ${alpha(primary, 0.6)}`,
            outlineOffset: 1,
          },
        }}
      />
    </Tooltip>
  )
}

function TruthToggle({ value, onChange, ariaLabel, toggleValues, readOnly = false }) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  const cycleValue = (current) => {
    const values = toggleValues?.length ? toggleValues : DEFAULT_TOGGLE
    if (!current) return values[0]
    const idx = values.indexOf(current)
    if (idx === -1) return values[0]
    if (idx < values.length - 1) return values[idx + 1]
    return ''
  }

  const handleClick = () => {
    if (readOnly) return
    onChange(cycleValue(value))
  }

  const primary = theme.palette.primary.main
  const getColor = () => {
    if (value === 'T') return primary
    if (value === 'F') return '#b22'
    if (value === 'B') return theme.palette.success.main
    if (value) return theme.palette.secondary.main
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
        fontSize: '1.125rem',
        fontWeight: 700,
        color: getColor(),
        cursor: readOnly ? 'default' : 'pointer',
        textTransform: 'uppercase',
        display: 'inline-flex',
        justifyContent: 'center',
        alignItems: 'center',
        border: 'none',
        backgroundColor: 'transparent',
        transition: 'color 0.15s ease, transform 0.12s ease',
        transform: 'scale(1)',
        '@media (hover: hover)': {
          '&:hover': {
            color: readOnly ? undefined : getColor(),
            transform: 'scale(1.06)',
            fontWeight: 800,
          },
        },
        '&:focus-visible': {
          outline: (t) => `2px solid ${alpha(t.palette.primary.main, 0.6)}`,
          outlineOffset: 2,
        },
      }}
    >
      {value || '-'}
    </Box>
  )
}

// flatten premises and conclusion for display
const getArgumentLabels = (argument) => {
  const premises = Array.isArray(argument?.premises) ? argument.premises : []
  const conclusion = argument?.conclusion ? [argument.conclusion] : []
  return [...premises, ...conclusion]
}

// decide argument layout mode
const isStackedLayout = (layout) => {
  if (!layout) return true
  return ['stacked', 'argument-block', 'vertical', 'column', 'premises-first'].includes(layout)
}

export default function SandboxTruthTable({
  problem,
  proof,
  answer,
  onStateChange,
  onComplete,
  savedState,
  assignmentQuestionId,
  attemptLimit,
  readOnly = false,
  hideActions = false,
  isAssignmentLocked = false,
  isInstructorView = false,
  onQuestionSaved,
  problemType,
  tokenizeStatement,
  toggleValues,
  defaultToggleValues = DEFAULT_TOGGLE,
  tokenTextTransform = 'uppercase',
  problemLabel,
}) {
  const theme = useTheme()
  const editorRef = useRef(null)
  const openEdit = () => editorRef.current?.open?.()
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
  const layout = argument?.layout || problem?.layout
  const labels = useMemo(() => getArgumentLabels(argument), [argument])
  const normalizedToggleValues = useMemo(
    () => normalizeToggleValues(toggleValues, defaultToggleValues),
    [toggleValues, defaultToggleValues]
  )

  // build table columns with separators
  const sandboxColumns = useMemo(() => {
    const columns = []
    const totalPremises = argument?.premises?.length || 0
    const hasConclusion = Boolean(argument?.conclusion)
    const totalStatements = labels.length
    labels.forEach((statement, idx) => {
      let tokens = []
      if (tokenizeStatement) {
        tokens = tokenizeStatement(statement) || []
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
  }, [argument?.conclusion, argument?.premises, labels, tokenizeStatement])
  const sandboxCellCount = useMemo(
    () => sandboxColumns.filter((col) => !col.separator).length,
    [sandboxColumns]
  )
  const defaultRow = useMemo(() => Array(sandboxCellCount).fill(''), [sandboxCellCount])

  const initialSelections = useMemo(() => {
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
  }, [mcQuestions, savedState?.ans, savedState?.answers])

  const initialSandboxRows = useMemo(() => {
    if (Array.isArray(savedState?.sandboxRows) && savedState.sandboxRows.length > 0) {
      return savedState.sandboxRows.map((row) =>
        defaultRow.map((_, idx) => toSymbol(row?.[idx]) || '')
      )
    }
    if (Array.isArray(savedState?.sandboxRow)) {
      return [defaultRow.map((_, idx) => toSymbol(savedState.sandboxRow[idx]) || '')]
    }
    return [defaultRow]
  }, [defaultRow, savedState?.sandboxRow, savedState?.sandboxRows])

  const [selectedValues, setSelectedValues] = useState(() => initialSelections)
  const [sandboxRows, setSandboxRows] = useState(() => initialSandboxRows)
  const [selectedColumns, setSelectedColumns] = useState([])
  const onStateChangeTimerRef = useRef(null)

  useEffect(() => {
    setSelectedValues((prev) => (rowsEqual(prev, initialSelections) ? prev : initialSelections))
  }, [initialSelections])

  useEffect(() => {
    setSandboxRows((prev) => (matrixEqual(prev, initialSandboxRows) ? prev : initialSandboxRows))
  }, [initialSandboxRows])

  useEffect(() => {
    setSelectedColumns([])
  }, [sandboxCellCount])

  useEffect(() => () => clearDebounce(onStateChangeTimerRef), [])

  const scheduleStateChange = useCallback((next) => {
    scheduleDebouncedChange(onStateChangeTimerRef, onStateChange, next)
  }, [onStateChange])

  const handleChoiceChange = (index, value) => {
    if (readOnly) return
    setSelectedValues((prev) => {
      const next = [...prev]
      next[index] = value
      const answers = next.map((val) => (val === '' ? '' : parseInt(val, 10)))
      scheduleStateChange({ answers, ans: answers[0] ?? '', sandboxRows })
      return next
    })
  }

  const toggleColumn = (colIndex) => {
    setSelectedColumns((prev) => (
      prev.includes(colIndex) ? prev.filter((idx) => idx !== colIndex) : [...prev, colIndex]
    ))
  }
  const highlightStyle = useMemo(
    () => ({ backgroundColor: alpha(theme.palette.primary.main, 0.14) }),
    [theme.palette.primary.main]
  )

  const handleSandboxChange = (rowIndex, colIndex, value) => {
    if (readOnly) return
    setSandboxRows((prev) => {
      const next = prev.map((row, idx) => (idx === rowIndex ? [...row] : row))
      next[rowIndex][colIndex] = value
      const answers = selectedValues.map((val) => (val === '' ? '' : parseInt(val, 10)))
      scheduleStateChange({ answers, ans: answers[0] ?? '', sandboxRows: next })
      return next
    })
  }

  const handleAddRow = () => {
    if (readOnly) return
    setSandboxRows((prev) => {
      const next = [...prev, [...defaultRow]]
      const answers = selectedValues.map((val) => (val === '' ? '' : parseInt(val, 10)))
      scheduleStateChange({ answers, ans: answers[0] ?? '', sandboxRows: next })
      return next
    })
  }

  const { status, message, isChecking, handleCheck, handleStartOver, setMessage, attemptCount, maxAttempts, isLocked } =
    useProblemChecker({
      answer,
      problemType,
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

  const correctIndices = Array.isArray(answer)
    ? answer
    : (answer !== undefined && answer !== null ? [answer] : [])
  const hasCorrectAnswer = correctIndices.length > 0 || mcQuestions.some((q) => q.answerIndex != null || q.answer != null || q.correctIndex != null)
  const showSolution = isLocked && status !== 'correct' && mcQuestions.length > 0 && hasCorrectAnswer

  return (
    <ProblemFrame
      problemLabel={problemLabel}
      prompt={prompt}
      minHeight="200px"
      cardMaxWidth="980px"
      isInstructorView={isInstructorView && !!proof}
      onEditQuestion={proof ? openEdit : undefined}
      status={status}
      message={message}
      onCloseStatus={() => setMessage('')}
      actionNode={!hideActions ? (
        <ProblemSetButtons
          onCheck={handleCheck}
          onStartOver={handleStartOver}
          isChecking={isChecking}
          isDisabled={mcQuestions.length === 0 || selectedValues.some((val) => val === '') || isLocked || isAssignmentLocked}
          align="flex-start"
          attemptCount={attemptCount}
          attemptLimit={maxAttempts}
          isInstructorView={isInstructorView}
        />
      ) : null}
      editorNode={isInstructorView && proof ? (
        <InstructorQuestionEditor
          ref={editorRef}
          proof={proof}
          isInstructorView
          onSaved={onQuestionSaved}
          trigger="none"
        />
      ) : null}
    >
            {argument?.premises?.length > 0 && (
              <Box sx={{ width: '100%', display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
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
                        '& .tt-row-selector-cell': {
                          border: 'none !important',
                          borderBottom: 'none !important',
                          backgroundColor: 'transparent !important',
                        },
                        '& .tt-selector-row .MuiTableCell-root': {
                          border: 'none !important',
                          borderBottom: 'none !important',
                          backgroundColor: 'transparent !important',
                        },
                        '& .tt-selector-corner, & .tt-selector-corner-bottom': {
                          border: 'none !important',
                          borderBottom: 'none !important',
                        },
                      }}
                    >
                      <Table className="tt-table">
                        <TableHead
                          className="tt-head"
                          sx={{
                            '& .tt-token': { textTransform: tokenTextTransform },
                          }}
                        >
                          <TableRow className="tt-token-row">
                            {sandboxColumns.map((col, idx) => (
                              <TableCell
                                key={`stt-label-${idx}`}
                                className="tt-token"
                                align="center"
                                aria-label={getTokenSpeechLabel(col.token)}
                                sx={col.separator
                                  ? { width: 18, px: 0, background: 'transparent', color: 'text.secondary', textTransform: tokenTextTransform }
                                  : { textTransform: tokenTextTransform }}
                              >
                                <span aria-hidden="true">{col.token}</span>
                              </TableCell>
                            ))}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {sandboxRows.map((row, rowIndex) => (
                            <TableRow key={`stt-row-${rowIndex}`} className="tt-row">
                              {sandboxColumns.map((col, idx) => {
                                if (col.separator) {
                                  return (
                                    <TableCell
                                      key={`stt-cell-${rowIndex}-${idx}`}
                                      className="tt-cell"
                                      align="center"
                                      sx={{ background: 'transparent' }}
                                    />
                                  )
                                }
                                const dataIndex = sandboxColumns
                                  .slice(0, idx)
                                  .filter((c) => !c.separator).length
                                const colMatch = selectedColumns.includes(dataIndex)
                                return (
                                  <TableCell
                                    key={`stt-cell-${rowIndex}-${idx}`}
                                    className="tt-cell"
                                    align="center"
                                    sx={colMatch ? highlightStyle : undefined}
                                  >
                                    <TruthToggle
                                      value={row?.[dataIndex] ?? ''}
                                      onChange={(value) => handleSandboxChange(rowIndex, dataIndex, value)}
                                      ariaLabel={`Sandbox row ${rowIndex + 1} col ${dataIndex + 1}`}
                                      toggleValues={normalizedToggleValues}
                                      readOnly={readOnly}
                                    />
                                  </TableCell>
                                )
                              })}
                            </TableRow>
                          ))}
                          <TableRow className="tt-selector-row">
                            {sandboxColumns.map((col, idx) => {
                              if (col.separator) {
                                return (
                                  <TableCell
                                    key={`stt-colsel-sep-${idx}`}
                                    align="center"
                                    sx={{ width: 16, minWidth: 16, p: 0, border: 'none !important' }}
                                  />
                                )
                              }
                              const dataIndex = sandboxColumns
                                .slice(0, idx)
                                .filter((c) => !c.separator).length
                              return (
                                <TableCell
                                  key={`stt-colsel-${idx}`}
                                  align="center"
                                  sx={{ width: 20, minWidth: 20, p: 0.25 }}
                                >
                                  <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                                    <ColumnRowSelectorBox
                                      selected={selectedColumns.includes(dataIndex)}
                                      onClick={() => toggleColumn(dataIndex)}
                                      ariaLabel={`Select column ${dataIndex + 1}`}
                                      theme={theme}
                                      tooltip="highlight column"
                                    />
                                  </Box>
                                </TableCell>
                              )
                            })}
                          </TableRow>
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
                  <Box key={`stt-mc-${qIdx}`} sx={{ width: '100%' }}>
                    <PromptText content={mcq.prompt} sx={{ ...sectionLabelSx, fontWeight: 500 }} />
                    <RadioGroup
                      value={selectedValues[qIdx] ?? ''}
                      onChange={(event) => handleChoiceChange(qIdx, event.target.value)}
                      name={`${problemType}-choice-${qIdx}`}
                    >
                      {(mcq.choices || []).map((choice, index) => (
                        <FormControlLabel
                          key={`${choice}-${index}`}
                          value={String(index)}
                          control={<Radio disabled={readOnly || isLocked} />}
                          label={choice}
                          sx={choiceLabelWithGapSx}
                        />
                      ))}
                    </RadioGroup>
                  </Box>
                ))}
              </Stack>
            </FormControl>

      <SolutionReveal show={showSolution} title="Correct Answer">
        <Stack spacing={2}>
          {mcQuestions.map((mcq, qIdx) => {
            const correctIndex = correctIndices[qIdx] ?? mcq?.answerIndex ?? mcq?.answer ?? mcq?.correctIndex
            const choices = mcq?.choices || []
            const correctChoice = Number.isFinite(Number(correctIndex)) && choices[Number(correctIndex)] != null
              ? choices[Number(correctIndex)]
              : null
            if (correctChoice == null && !Number.isFinite(Number(correctIndex))) return null
            return (
              <Box key={`solution-${qIdx}`}>
                <PromptText content={mcq?.prompt} variant="subtitle2" sx={{ ...sectionLabelSx, mb: 0.5, fontWeight: 600 }} />
                <Typography component="div" variant="body2" color="text.secondary">
                  {correctChoice != null ? correctChoice : `(Answer index: ${correctIndex})`}
                </Typography>
              </Box>
            )
          })}
        </Stack>
      </SolutionReveal>
    </ProblemFrame>
  )
}

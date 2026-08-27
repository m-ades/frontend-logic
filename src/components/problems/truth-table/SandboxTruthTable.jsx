import { useMemo, useState, useEffect, useRef, useCallback, useId } from 'react'
import {
  Box,
  Stack,
  Typography,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  Button,
} from '@mui/material'
import InstructorQuestionEditor from '../InstructorQuestionEditor.jsx'
import ProblemSetButtons from '../mui/frame/ProblemSetButtons.jsx'
import ProblemFrame, { choiceLabelWithGapSx, sectionLabelSx } from '../mui/frame/ProblemFrame.jsx'
import TruthTableGrid from './TruthTableGrid.jsx'
import { useProblemChecker } from '../../../hooks/useProblemChecker.js'
import SolutionReveal from '../SolutionReveal.jsx'
import PromptText from '../../ui/PromptText.jsx'
import { rowsEqual, matrixEqual, clearDebounce, scheduleDebouncedChange } from '../../../utils/tablePerf.js'

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
  logicSystem,
}) {
  const instanceId = useId()
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
  const layout = argument.layout || problem?.layout
  const labels = useMemo(() => getArgumentLabels(argument), [argument])
  const normalizedToggleValues = useMemo(
    () => normalizeToggleValues(toggleValues, defaultToggleValues),
    [toggleValues, defaultToggleValues]
  )

  // build table columns with separators
  const sandboxColumns = useMemo(() => {
    const columns = []
    const totalPremises = argument.premises?.length || 0
    const hasConclusion = Boolean(argument.conclusion)
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
  }, [argument.conclusion, argument.premises, labels, tokenizeStatement])
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
  const [selectedRows, setSelectedRows] = useState([])
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

  const tableSpecs = useMemo(() => {
    return labels.map((statement) => {
      let tokens = []
      if (tokenizeStatement) {
        tokens = tokenizeStatement(statement) || []
      }
      if (!tokens.length) {
        tokens = statement ? [statement] : []
      }
      return {
        label: statement,
        tokens,
        headerTokens: tokens,
      }
    })
  }, [labels, tokenizeStatement])
  const tableOffsets = useMemo(() => {
    let offset = 0
    return tableSpecs.map((table) => {
      const current = offset
      offset += table.tokens.length
      return current
    })
  }, [tableSpecs])
  const sandboxTableInputs = useMemo(
    () => tableSpecs.map((table, tableIndex) =>
      sandboxRows.map((row) => row.slice(tableOffsets[tableIndex], tableOffsets[tableIndex] + table.tokens.length))
    ),
    [sandboxRows, tableOffsets, tableSpecs]
  )
  const sandboxTables = useMemo(
    () => tableSpecs.map((table, tableIndex) => ({
      ...table,
      rows: sandboxTableInputs[tableIndex] ?? [],
    })),
    [sandboxTableInputs, tableSpecs]
  )

  const toggleColumn = (tableIndex, colIndex) => {
    setSelectedColumns((prev) => (
      prev.some((entry) => entry.tableIndex === tableIndex && entry.colIndex === colIndex)
        ? prev.filter((entry) => !(entry.tableIndex === tableIndex && entry.colIndex === colIndex))
        : [...prev, { tableIndex, colIndex }]
    ))
  }
  const toggleRow = (rowIndex) => {
    setSelectedRows((prev) =>
      prev.includes(rowIndex) ? prev.filter((entry) => entry !== rowIndex) : [...prev, rowIndex]
    )
  }

  const handleSandboxChange = (tableIndex, rowIndex, colIndex, value) => {
    if (readOnly) return
    const flatIndex = tableOffsets[tableIndex] + colIndex
    setSandboxRows((prev) => {
      const next = prev.map((row, idx) => (idx === rowIndex ? [...row] : row))
      next[rowIndex][flatIndex] = value
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
  const solutionItems = useMemo(
    () =>
      mcQuestions.flatMap((mcq, qIdx) => {
        const correctIndex = correctIndices[qIdx] ?? mcq?.answerIndex ?? mcq?.answer ?? mcq?.correctIndex
        const choices = mcq?.choices || []
        const numericIndex = Number(correctIndex)
        const correctChoice = Number.isFinite(numericIndex) && choices[numericIndex] != null
          ? choices[numericIndex]
          : null
        if (correctChoice == null && !Number.isFinite(numericIndex)) {
          return []
        }
        return [{
          key: `solution-${qIdx}`,
          prompt: mcq?.prompt,
          content: correctChoice != null ? correctChoice : `(Answer index: ${correctIndex})`,
        }]
      }),
    [correctIndices, mcQuestions]
  )
  const showSolution = isLocked && status !== 'correct' && solutionItems.length > 0

  return (
    <ProblemFrame
      problemLabel={problemLabel}
      prompt={prompt}
      minHeight="200px"
      cardMaxWidth="1060px"
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
          logicSystem={logicSystem}
        />
      ) : null}
    >
            {argument.premises?.length > 0 && (
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
                <Box sx={{ width: '100%', overflowX: 'auto' }}>
                  <Box sx={{ display: 'inline-flex', flexDirection: 'column', minWidth: 'max-content' }}>
                    <TruthTableGrid
                      tables={sandboxTables}
                      tableInputs={sandboxTableInputs}
                      combined
                      readOnly={readOnly}
                      selectedColumns={selectedColumns}
                      selectedRows={selectedRows}
                      onToggleColumn={toggleColumn}
                      onToggleRow={toggleRow}
                      onCellChange={handleSandboxChange}
                      showConclusionMarker={Boolean(argument.conclusion)}
                      toggleValues={normalizedToggleValues}
                      shrinkWrap
                    />
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 0.25, width: '100%' }}>
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
                      name={`${problemType}-${assignmentQuestionId ?? proof?.id ?? instanceId}-choice-${qIdx}`}
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
          {solutionItems.map((item) => (
              <Box key={item.key}>
                <PromptText content={item.prompt} variant="subtitle2" sx={{ ...sectionLabelSx, mb: 0.5, fontWeight: 600 }} />
                <Typography component="div" variant="body2" color="text.secondary">
                  {item.content}
                </Typography>
              </Box>
          ))}
        </Stack>
      </SolutionReveal>
    </ProblemFrame>
  )
}

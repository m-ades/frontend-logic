import { useMemo, useState, useEffect, useRef, useCallback, useId } from 'react'
import {
  Box,
  Stack,
  Typography,
  Button,
} from '@mui/material'
import InstructorQuestionEditor from '../InstructorQuestionEditor.jsx'
import ProblemSetButtons from '../mui/frame/ProblemSetButtons.jsx'
import ProblemFrame, { sectionLabelSx } from '../mui/frame/ProblemFrame.jsx'
import TruthTableGrid from './TruthTableGrid.jsx'
import { SubquestionChoiceList } from '../mui/choice/ChoiceGroup.jsx'
import { getSubquestionChoices, isMultiSelectSubquestion, normalizeSubquestionSelection } from '../../../lib/logicpenguin/multiple-choice-utils.js'
import { useProblemChecker } from '../../../hooks/useProblemChecker.js'
import SolutionReveal from '../SolutionReveal.jsx'
import PromptText from '../../ui/PromptText.jsx'
import { rowsEqual, matrixEqual, clearDebounce, scheduleDebouncedChange } from '../../../utils/tablePerf.js'
import { getNotation } from '../../../lib/logicSystems.js'
import { formatTruthTableStatements, SELECTOR_LANE_WIDTH } from './truthTableUi.js'
import { logicStatementsToTex } from '../../../lib/logicTex.js'
import MathJaxFormula from '../../ui/MathJaxFormula.jsx'

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
  const notation = getNotation(logicSystem)
  const isHurley = notation === 'hurley'
  const statementText = formatTruthTableStatements(labels, notation, Boolean(argument.conclusion))
  const statementTex = logicStatementsToTex(labels, Boolean(argument.conclusion))
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
  const normalizedToggleValues = useMemo(
    () => normalizeToggleValues(toggleValues, defaultToggleValues),
    [toggleValues, defaultToggleValues]
  )
  const sandboxCellCount = useMemo(
    () => tableSpecs.reduce((count, table) => count + table.tokens.length, 0),
    [tableSpecs]
  )
  const defaultRow = useMemo(() => Array(sandboxCellCount).fill(''), [sandboxCellCount])

  const initialSelections = useMemo(
    () => mcQuestions.map((question, idx) => normalizeSubquestionSelection(
      question,
      savedState?.answers?.[idx] ?? (idx === 0 ? savedState?.ans : undefined)
    )),
    [mcQuestions, savedState?.ans, savedState?.answers]
  )
  const emptySelections = () => mcQuestions.map((question) => isMultiSelectSubquestion(question) ? [] : '')
  const hasIncompleteSelection = (selectedValues) => selectedValues.some((value) => (
    Array.isArray(value) ? value.length === 0 : value === ''
  ))

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
      scheduleStateChange({ answers: next, ans: next[0] ?? '', sandboxRows })
      return next
    })
  }

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
      scheduleStateChange({ answers: selectedValues, ans: selectedValues[0] ?? '', sandboxRows: next })
      return next
    })
  }

  const handleAddRow = () => {
    if (readOnly) return
    setSandboxRows((prev) => {
      const next = [...prev, [...defaultRow]]
      scheduleStateChange({ answers: selectedValues, ans: selectedValues[0] ?? '', sandboxRows: next })
      return next
    })
  }

  const { status, message, isChecking, handleCheck, handleStartOver, setMessage, attemptCount, maxAttempts, isLocked } =
    useProblemChecker({
      answer,
      problemType,
      question: problem,
      getAnswer: () => ({
        answers: selectedValues,
        ans: selectedValues[0] ?? '',
        sandboxRows,
      }),
      onComplete,
      isDisabled: () => hasIncompleteSelection(selectedValues) || mcQuestions.length === 0,
      resetInput: () => {
        const reset = [[...defaultRow]]
        const answers = emptySelections()
        setSelectedValues(answers)
        setSandboxRows(reset)
        onStateChange?.({ answers, ans: answers[0] ?? '', sandboxRows: reset })
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
        const expected = correctIndices[qIdx] ?? (isMultiSelectSubquestion(mcq)
          ? mcq?.answerIndices
          : mcq?.answerIndex ?? mcq?.answer ?? mcq?.correctIndex)
        const selection = normalizeSubquestionSelection(mcq, expected)
        const indices = Array.isArray(selection) ? selection : (selection === '' ? [] : [selection])
        const choices = getSubquestionChoices(mcq)
        if (indices.length === 0) return []
        return [{
          key: `solution-${qIdx}`,
          prompt: mcq?.prompt,
          content: indices.map((index) => choices[index]).join('; '),
        }]
      }),
    [correctIndices, mcQuestions]
  )
  const showSolution = isLocked && status !== 'correct' && solutionItems.length > 0

  return (
    <ProblemFrame
      problemLabel={problemLabel}
      prompt={prompt}
      expandForContent
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
          isDisabled={mcQuestions.length === 0 || hasIncompleteSelection(selectedValues) || isLocked || isAssignmentLocked}
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
                {isHurley && isStackedLayout(layout) ? (
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
                ) : isHurley ? (
                  <Typography sx={{ fontSize: '1.1rem', fontFamily: 'monospace' }}>
                    {labels.join(' / ')}
                  </Typography>
                ) : (
                  <Box sx={{ fontSize: '1.2rem', lineHeight: 1.6, overflowX: 'auto', overflowY: 'clip' }}>
                    <MathJaxFormula tex={statementTex} fallback={statementText} display={false} block />
                  </Box>
                )}
              </Box>
            )}

            {sandboxCellCount > 0 && (
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
                      showHurleySeparators={isHurley && Boolean(argument.conclusion)}
                      toggleValues={normalizedToggleValues}
                      shrinkWrap
                    />
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 0.25, width: '100%', pr: `${SELECTOR_LANE_WIDTH}px` }}>
                      <Button size="small" variant="outlined" onClick={handleAddRow} disabled={readOnly}>
                        + Add row
                      </Button>
                    </Box>
                  </Box>
                </Box>
              </Box>
            )}

            <SubquestionChoiceList
              questions={mcQuestions}
              selectedValues={selectedValues}
              namePrefix={`${problemType}-${assignmentQuestionId ?? proof?.id ?? instanceId}-choice`}
              promptSx={{ ...sectionLabelSx, fontWeight: 500 }}
              disabled={readOnly || isLocked || isAssignmentLocked}
              onSingleChange={(qIdx, value) => handleChoiceChange(qIdx, Number(value))}
              onMultiChange={(qIdx, index, checked) => {
                const current = selectedValues[qIdx] || []
                handleChoiceChange(qIdx, checked ? [...current, index] : current.filter((value) => value !== index))
              }}
            />

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

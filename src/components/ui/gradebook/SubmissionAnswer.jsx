import { Box, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material'
import PromptText from '../PromptText.jsx'
import { SubquestionChoiceList, FieldsetChoiceGroup } from '../../problems/mui/choice/ChoiceGroup.jsx'
import getFormulaClass from '../../../lib/logicpenguin/symbolic/formula.js'
import { multiTables } from '../../../lib/logicpenguin/symbolic/libsemantics.js'
import { getNotation } from '../../../lib/logicSystems.js'

/*
displays a question snapshot and its submitted answer as static content
choice indices resolve against the snapshot and false and zero remain visible
structured answers retain their fields when no specialized display applies
missing answer data displays an empty state and never falls back to a solution
*/
export default function SubmissionAnswer({ snapshot = {}, data, logicSystem }) {
  const type = snapshot.type || snapshot.problemType || snapshot.logic_problem_type
  const prompt = snapshot.prompt || snapshot.description || snapshot.text
  const statement = snapshot.statement || snapshot.formula || snapshot.sentence
  const premises = snapshot.prems || snapshot.premises || snapshot.argument?.prems || snapshot.argument?.premises
  const conclusion = snapshot.conc || snapshot.conclusion || snapshot.argument?.conc || snapshot.argument?.conclusion
  const choiceProblem = snapshot.multipleChoice || snapshot
  const questions = choiceProblem.subquestions || choiceProblem.questions || snapshot.subquestions || snapshot.questions
  const choices = choiceProblem.choices
  const hasChoices = ['multiple-choice', 'indirect-truth-table', 'nonclassical-truth-table'].includes(type)
  const table = snapshot.truthTable || snapshot.truth_table || {}
  const statements = table.statements || table.formulas || table.lefts?.concat(table.right) ||
    (table.left ? [table.left, table.right] : [table.statement || table.formula || statement])

  return (
    <Stack spacing={2}>
      <PromptText content={prompt} />
      <PromptText content={snapshot.legend || snapshot.legend_text || snapshot.legendText} />
      {statement && statement !== prompt && <PromptText content={statement} />}
      {Array.isArray(premises) && premises.map((premise, index) => <PromptText key={index} content={`${index + 1}. ${premise}`} />)}
      {conclusion && <PromptText content={`∴ ${conclusion}`} />}
      <Typography variant="subtitle2">Submitted answer</Typography>
      {data == null ? (
        <Typography color="text.secondary">No answer submitted.</Typography>
      ) : hasChoices && questions?.length ? (
        <>
          <SubquestionChoiceList questions={questions} selectedValues={data.answers || data.ans || data} namePrefix="submitted-choice" disabled />
          {data.sandboxRows && <AnswerValue value={data.sandboxRows} />}
          {data.sandboxRow && <AnswerValue value={[data.sandboxRow]} />}
        </>
      ) : hasChoices && choices?.length ? (
        <FieldsetChoiceGroup choices={choices} selectedValue={data.ans ?? data} isMultiSelect={Array.isArray(data.ans ?? data)} name="submitted-choice" disabled />
      ) : type === 'truth-table' && data.right ? (
        <Stack spacing={2}>
          {[...(data.lefts || []), data.right].map((item, index) => (
            <AnswerTable key={index} value={item} statement={statements[index]} logicSystem={logicSystem} rowHighlights={data.rowhls} />
          ))}
          <AnswerValue value={Object.fromEntries(Object.entries(data).filter(([key]) => !['lefts', 'right', 'rowhls'].includes(key)))} />
        </Stack>
      ) : data.row && statement ? (
        <>
          <AnswerTable value={{ rows: [data.row] }} statement={statement} logicSystem={logicSystem} />
          <AnswerValue value={Object.fromEntries(Object.entries(data).filter(([key]) => key !== 'row'))} />
        </>
      ) : (
        <AnswerValue value={data} />
      )}
    </Stack>
  )
}

const fieldLabels = {
  ans: 'Answer', mcans: 'Classification', prems: 'Premises', conc: 'Conclusion',
  lefts: 'Premise tables', right: 'Conclusion table', tableAns: 'Truth table',
  rowhls: 'Highlighted rows', colhls: 'Highlighted columns',
  taut: 'Tautology', contra: 'Self-contradiction', equiv: 'Equivalent',
  correct: 'Factually correct', valid: 'Valid', sound: 'Sound',
}

function AnswerValue({ value }) {
  if (value == null || value === '') return <Typography color="text.secondary">—</Typography>
  if (typeof value !== 'object') {
    return <Typography sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{typeof value === 'boolean' ? (value ? 'True' : 'False') : String(value)}</Typography>
  }
  if (Array.isArray(value.parts)) {
    return (
      <Box sx={{ pl: 2, borderLeft: '1px solid', borderColor: 'divider' }}>
        {value.parts.map((part, index) => part.parts ? <AnswerValue key={index} value={part} /> : (
          <Stack key={index} direction="row" spacing={2} sx={{ py: 0.5 }}>
            <Typography color="text.secondary">{part.n}</Typography>
            <Typography sx={{ flex: 1, whiteSpace: 'pre-wrap' }}>{part.s}</Typography>
            <Typography color="text.secondary">{part.j}</Typography>
          </Stack>
        ))}
      </Box>
    )
  }
  if (Array.isArray(value.rows)) return <AnswerTable value={value} />
  if (Array.isArray(value)) {
    if (value.length && value.every(Array.isArray)) return <AnswerTable value={{ rows: value }} />
    return <Stack spacing={1}>{value.map((item, index) => <AnswerValue key={index} value={item} />)}</Stack>
  }
  return (
    <Box component="dl" sx={{ m: 0 }}>
      {Object.entries(value).map(([key, item]) => (
        <Box key={key} sx={{ mb: 1 }}>
          <Typography component="dt" variant="body2" color="text.secondary">
            {fieldLabels[key] || key.replace(/([a-z])([A-Z])/g, '$1 $2').replaceAll('_', ' ')}
          </Typography>
          <Box component="dd" sx={{ m: 0 }}><AnswerValue value={item} /></Box>
        </Box>
      ))}
    </Box>
  )
}

function AnswerTable({ value, statement, logicSystem, rowHighlights }) {
  let tokens = []
  if (statement) {
    try {
      const notation = getNotation(logicSystem)
      const Formula = getFormulaClass(notation)
      tokens = multiTables([Formula.from(statement)], notation).tables[0].tokens
    } catch {
      // preserve saved rows when the formula cannot be parsed
    }
  }
  return (
    <TableContainer>
      <Table size="small" aria-label={statement || 'Submitted truth table'}>
        {statement && <caption style={{ captionSide: 'top' }}>{statement}</caption>}
        {tokens.length > 0 && <TableHead><TableRow>{tokens.map((token, index) => <TableCell key={index} align="center">{token}</TableCell>)}</TableRow></TableHead>}
        <TableBody>
          {value.rows.map((row, index) => (
            <TableRow key={index} selected={Boolean(rowHighlights?.[index])}>
              {row.map((cell, column) => (
                <TableCell key={column} align="center" sx={{ backgroundColor: value.colhls?.[column] ? 'action.selected' : undefined }}>
                  {cell === true ? 'T' : cell === false ? 'F' : cell == null || cell === '' || cell === -1 ? '—' : String(cell)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

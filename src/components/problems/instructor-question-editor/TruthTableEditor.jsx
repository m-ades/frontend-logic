import * as React from 'react'
import {
  Box,
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import { DEFAULT_LOGIC_SYSTEM } from '../../../lib/logicSystems.js'
import { displayFormulaInput, normalizeFormulaInput, normalizeFormulaInputs } from './formulaHelpers.js'
import { deepMerge, typeKey } from './snapshotUtils.js'

export function buildTruthTableSnapshot(proof, edited, existing, logicSystem = DEFAULT_LOGIC_SYSTEM) {
  const tt = proof.truthTable || {}
  const e = existing && typeof existing === 'object' ? existing : {}
  const kind = edited.kind ?? tt.kind ?? 'formula'
  const prompt = edited.prompt ?? tt.prompt ?? proof.description ?? ''
  const options = {
    ...(tt.options || {}),
    ...(edited.partialCredit !== undefined ? { partialCredit: edited.partialCredit } : {}),
    ...(edited.classificationQuestion !== undefined ? { question: edited.classificationQuestion } : {}),
    ...(edited.mainOperatorHighlight !== undefined ? { highlightMainOperator: edited.mainOperatorHighlight } : {}),
    ...(edited.witnessRowHighlight !== undefined ? { highlightWitnessRow: edited.witnessRowHighlight } : {}),
  }
  const equivalenceStatements = Array.isArray(edited.statements)
    ? [...edited.statements]
    : (Array.isArray(tt.statements) ? [...tt.statements] : [tt.left ?? '', tt.right ?? ''])
  while (equivalenceStatements.length < 2) equivalenceStatements.push('')
  const truthTableData = {
    kind,
    options,
    ...(kind === 'formula' && {
      statement: normalizeFormulaInput(edited.statement ?? tt.statement ?? tt.formula ?? '', logicSystem),
    }),
    ...(kind === 'equivalence' && {
      statements: normalizeFormulaInputs(equivalenceStatements, logicSystem),
    }),
    ...(kind === 'argument' && {
      lefts: normalizeFormulaInputs(Array.isArray(edited.lefts) ? edited.lefts : (tt.lefts || []), logicSystem),
      right: normalizeFormulaInput(edited.right ?? tt.right ?? '', logicSystem),
    }),
  }
  const patch = { [typeKey(e)]: 'truth-table', prompt }
  const ttKey = e.truth_table !== undefined ? 'truth_table' : 'truthTable'
  patch[ttKey] = deepMerge(e[ttKey], truthTableData)
  if (kind === 'equivalence') {
    delete patch[ttKey].left
    delete patch[ttKey].right
  }
  return patch
}

export function TruthTableEditorForm({ proof, value, onChange, logicSystem = DEFAULT_LOGIC_SYSTEM }) {
  const tt = proof?.truthTable || {}
  const kind = value.kind ?? tt.kind ?? 'formula'
  const prompt = value.prompt ?? tt.prompt ?? proof?.description ?? ''
  const statement = value.statement ?? tt.statement ?? tt.formula ?? ''
  const right = value.right ?? tt.right ?? ''
  const lefts = Array.isArray(value.lefts) ? value.lefts : (tt.lefts || [''])
  const statementValues = Array.isArray(value.statements)
    ? value.statements
    : (Array.isArray(tt.statements) ? tt.statements : [tt.left ?? '', tt.right ?? ''])
  const statements = statementValues.length >= 2
    ? statementValues
    : [...statementValues, ...Array(2 - statementValues.length).fill('')]
  const opts = tt.options || proof?.options || {}
  const partialCredit = value.partialCredit ?? opts.partialCredit ?? opts.partialcredit ?? opts.partial_credit ?? proof?.partialCredit ?? false
  const classificationQuestion = value.classificationQuestion ?? opts.question ?? false
  const mainOperatorHighlight = value.mainOperatorHighlight ?? opts.highlightMainOperator ?? false
  const witnessRowHighlight = value.witnessRowHighlight ?? opts.highlightWitnessRow ?? false
  const witnessRowLabel = kind === 'argument'
    ? 'Require highlighting a row that shows the argument is invalid'
    : kind === 'equivalence'
      ? 'Require highlighting a row that shows the set is jointly satisfiable'
      : 'Require highlighting a row that shows the sentence is not a contradiction'

  const update = (updates) => onChange({ ...value, ...updates })

  return (
    <Stack spacing={2}>
      <TextField
        label="Prompt"
        multiline
        minRows={1}
        value={prompt}
        onChange={(e) => update({ prompt: e.target.value })}
        fullWidth
        variant="outlined"
        placeholder="e.g. Construct a truth table for the following statement."
      />
      <FormControl fullWidth size="small">
        <InputLabel>Question type</InputLabel>
        <Select
          value={kind}
          label="Question type"
          onChange={(e) => update({ kind: e.target.value })}
        >
          <MenuItem value="formula">Statement</MenuItem>
          <MenuItem value="argument">Argument</MenuItem>
          <MenuItem value="equivalence">Statement comparison</MenuItem>
        </Select>
      </FormControl>

      {kind === 'formula' && (
        <TextField
          label="Statement"
          value={statement}
          onChange={(e) => update({ statement: displayFormulaInput(e.target.value, logicSystem) })}
          fullWidth
          variant="outlined"
          placeholder="e.g. (P & Q) → R"
        />
      )}
      {kind === 'equivalence' && (
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Statements</Typography>
          {statements.map((line, idx) => (
            <Stack key={idx} direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
              <TextField
                size="small"
                label={`Statement ${idx + 1}`}
                value={line}
                onChange={(e) => {
                  const next = [...statements]
                  next[idx] = displayFormulaInput(e.target.value, logicSystem)
                  update({ statements: next })
                }}
                fullWidth
              />
              <IconButton
                size="small"
                disabled={statements.length <= 2}
                onClick={() => update({ statements: statements.filter((_, i) => i !== idx) })}
                aria-label={`Remove statement ${idx + 1}`}
              >
                <DeleteOutlineIcon />
              </IconButton>
            </Stack>
          ))}
          <Button
            size="small"
            startIcon={<AddIcon />}
            onClick={() => update({ statements: [...statements, ''] })}
          >
            Add statement
          </Button>
        </Box>
      )}
      {kind === 'argument' && (
        <>
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Premises</Typography>
            {(lefts.length ? lefts : ['']).map((line, idx) => (
              <Stack key={idx} direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                <TextField
                  size="small"
                  value={line}
                  onChange={(e) => {
                    const next = [...(lefts.length ? lefts : [''])]
                    next[idx] = displayFormulaInput(e.target.value, logicSystem)
                    update({ lefts: next })
                  }}
                  fullWidth
                  placeholder={`Premise ${idx + 1}`}
                />
                <IconButton
                  size="small"
                  onClick={() => {
                    const next = lefts.filter((_, i) => i !== idx)
                    update({ lefts: next.length ? next : [''] })
                  }}
                  aria-label="Remove premise"
                >
                  <DeleteOutlineIcon />
                </IconButton>
              </Stack>
            ))}
            <Button
              size="small"
              startIcon={<AddIcon />}
              onClick={() => update({ lefts: [...(lefts.length ? lefts : ['']), ''] })}
            >
              Add premise
            </Button>
          </Box>
          <TextField
            label="Conclusion"
            value={right}
            onChange={(e) => update({ right: displayFormulaInput(e.target.value, logicSystem) })}
            fullWidth
            variant="outlined"
          />
        </>
      )}

      <FormControlLabel
        control={
          <Checkbox
            checked={partialCredit}
            onChange={(e) => update({ partialCredit: e.target.checked })}
          />
        }
        label="Allow partial credit"
      />
      <FormControlLabel
        control={
          <Checkbox
            checked={classificationQuestion}
            onChange={(e) => update({ classificationQuestion: e.target.checked })}
          />
        }
        label="Ask classification"
      />
      {kind === 'formula' && (
        <FormControlLabel
          control={
            <Checkbox
              checked={mainOperatorHighlight}
              onChange={(e) => update({ mainOperatorHighlight: e.target.checked })}
            />
          }
          label="Require main operator highlight"
        />
      )}
      <FormControlLabel
        control={
          <Checkbox
            checked={witnessRowHighlight}
            onChange={(e) => update({ witnessRowHighlight: e.target.checked })}
          />
        }
        label={witnessRowLabel}
      />
    </Stack>
  )
}

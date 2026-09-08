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
import { isMultiSelectSubquestion, getSingleSelectAnswerIndex } from '../../../lib/logicpenguin/multiple-choice-utils.js'
import { displayFormulaInput, normalizeArgumentInput } from './formulaHelpers.js'
import { typeKey } from './snapshotUtils.js'

export function buildIndirectTruthTableSnapshot(proof, edited, existing, logicSystem = DEFAULT_LOGIC_SYSTEM) {
  const itt = proof.indirectTruthTable || {}
  const e = existing && typeof existing === 'object' ? existing : {}
  const prompt = edited.prompt ?? itt.prompt ?? proof.description ?? ''
  const normalizedArgument = normalizeArgumentInput(edited.argument ?? itt.argument ?? {}, logicSystem)
  const questions = Array.isArray(edited.questions) ? edited.questions : (itt.questions || itt.subquestions || [])
  const patch = { [typeKey(e)]: 'indirect-truth-table', prompt, argument: normalizedArgument, questions }
  if (edited.partialCredit !== undefined) {
    patch.partialCredit = edited.partialCredit
  }
  if (e.subquestions !== undefined) patch.subquestions = questions
  return patch
}

export function IndirectTruthTableEditorForm({ proof, value, onChange, logicSystem = DEFAULT_LOGIC_SYSTEM }) {
  const itt = proof?.indirectTruthTable || {}
  const prompt = value.prompt ?? itt.prompt ?? proof?.description ?? ''
  const argument = value.argument ?? itt.argument ?? {}
  const premises = Array.isArray(argument.premises) ? argument.premises : (argument.premises ? [argument.premises] : [])
  const conclusion = argument.conclusion ?? ''
  const questions = Array.isArray(value.questions) ? value.questions : (itt.questions || itt.subquestions || [])
  const partialCredit = value.partialCredit ?? proof?.partialCredit ?? false

  const update = (updates) => onChange({ ...value, ...updates })
  const setArgument = (arg) => update({ argument: { ...argument, ...arg } })

  const setPremises = (prems) => setArgument({ premises: prems })
  const setQuestions = (q) => update({ questions: q })

  const updateQuestion = (idx, qUpdates) => {
    const next = [...(questions.length ? questions : [{ prompt: '', choices: [], answerIndex: 0 }])]
    next[idx] = { ...(next[idx] || {}), ...qUpdates }
    setQuestions(next)
  }

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
      />
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>Premises</Typography>
        {(premises.length ? premises : ['']).map((line, idx) => (
          <Stack key={idx} direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
            <TextField
              size="small"
              value={line}
              onChange={(e) => {
                const next = [...(premises.length ? premises : [''])]
                next[idx] = displayFormulaInput(e.target.value, logicSystem)
                setPremises(next)
              }}
              fullWidth
              placeholder={`Premise ${idx + 1}`}
            />
            <IconButton size="small" onClick={() => setPremises(premises.filter((_, i) => i !== idx))} aria-label="Remove">
              <DeleteOutlineIcon />
            </IconButton>
          </Stack>
        ))}
        <Button size="small" startIcon={<AddIcon />} onClick={() => setPremises([...(premises.length ? premises : ['']), ''])}>
          Add premise
        </Button>
      </Box>
      <TextField
        label="Conclusion"
        value={conclusion}
        onChange={(e) => setArgument({ conclusion: displayFormulaInput(e.target.value, logicSystem) })}
        fullWidth
        variant="outlined"
      />
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>Questions</Typography>
        {(questions.length ? questions : [{ prompt: '', choices: [], answerIndex: 0 }]).map((q, qIdx) => {
          const isMultiSelect = isMultiSelectSubquestion(q)
          const answerIndex = getSingleSelectAnswerIndex(q) ?? 0
          const answerIndices = isMultiSelect ? (q.answerIndices ?? []) : [answerIndex]
          return (
            <Box key={qIdx} sx={{ mb: 2, p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
              <TextField
                size="small"
                label="Prompt"
                value={q.prompt ?? ''}
                onChange={(e) => updateQuestion(qIdx, { prompt: e.target.value })}
                fullWidth
                sx={{ mb: 1 }}
              />
              <Typography variant="caption" sx={{ display: 'block', mb: 0.5 }}>Choices</Typography>
              {(q.choices?.length ? q.choices : ['']).map((choice, cIdx) => (
                <Stack key={cIdx} direction="row" spacing={1} sx={{ mb: 0.5 }}>
                  <TextField
                    size="small"
                    value={choice}
                    onChange={(e) => {
                      const next = [...(q.choices || [''])]
                      next[cIdx] = e.target.value
                      updateQuestion(qIdx, { choices: next })
                    }}
                    fullWidth
                    placeholder={`Choice ${cIdx + 1}`}
                  />
                  <IconButton size="small" onClick={() => updateQuestion(qIdx, {
                    choices: (q.choices || []).filter((_, i) => i !== cIdx),
                    ...(isMultiSelect ? {
                      answerIndices: answerIndices.filter((i) => i !== cIdx).map((i) => i > cIdx ? i - 1 : i),
                    } : {
                      answerIndex: answerIndex === cIdx ? 0 : answerIndex > cIdx ? answerIndex - 1 : answerIndex,
                    }),
                  })} aria-label={`Remove choice ${cIdx + 1}`}>
                    <DeleteOutlineIcon />
                  </IconButton>
                </Stack>
              ))}
              <Button size="small" onClick={() => updateQuestion(qIdx, { choices: [...(q.choices || []), ''] })}>Add choice</Button>
              <FormControlLabel
                control={(
                  <Checkbox
                    checked={isMultiSelect}
                    onChange={(e) => updateQuestion(qIdx, {
                      multiSelect: e.target.checked,
                      answerIndices: e.target.checked ? answerIndices : [],
                      answerIndex: e.target.checked ? null : (answerIndices[0] ?? 0),
                    })}
                  />
                )}
                label="Allow multiple answers"
              />
              <FormControl fullWidth size="small" sx={{ mt: 1 }}>
                <InputLabel id={`itt-answer-${qIdx}`}>{isMultiSelect ? 'Correct answers' : 'Correct answer'}</InputLabel>
                <Select
                  multiple={isMultiSelect}
                  labelId={`itt-answer-${qIdx}`}
                  value={isMultiSelect ? answerIndices : answerIndex}
                  label={isMultiSelect ? 'Correct answers' : 'Correct answer'}
                  onChange={(e) => updateQuestion(qIdx, isMultiSelect
                    ? { answerIndices: e.target.value }
                    : { answerIndex: Number(e.target.value) })}
                  renderValue={isMultiSelect ? (selected) => selected.map((i) => `Choice ${i + 1}`).join(', ') : undefined}
                >
                  {(q.choices || []).map((_, i) => (
                    <MenuItem key={i} value={i}>
                      {isMultiSelect && <Checkbox checked={answerIndices.includes(i)} />}
                      Choice {i + 1}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          )
        })}
        <Button size="small" startIcon={<AddIcon />} onClick={() => setQuestions([...(questions.length ? questions : []), { prompt: '', choices: [], answerIndex: 0 }])}>
          Add question
        </Button>
      </Box>
      <FormControlLabel
        control={
          <Checkbox
            checked={Boolean(partialCredit)}
            onChange={(e) => update({ partialCredit: e.target.checked })}
          />
        }
        label="Allow partial credit"
      />
    </Stack>
  )
}

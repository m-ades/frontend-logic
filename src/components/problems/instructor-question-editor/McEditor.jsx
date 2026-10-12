import * as React from 'react'
import {
  Box,
  Button,
  FormControl,
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
import {
  getSingleSelectAnswerIndex,
  hasNonEmptyAnswerIndices,
  normalizeAnswerIndices,
} from '@logic-app/logic-engine/multiple-choice-utils.js'
import { typeKey } from './snapshotUtils.js'
import { findQuestionWithoutAnswer, hasAnswerKey, removeChoiceFromAnswers } from './choiceAnswers.js'

export function buildMcSnapshot(proof, edited, existing) {
  const mc = proof.multipleChoice || {}
  const choices = edited.choices ?? mc.choices ?? []
  const prompt = edited.prompt ?? mc.prompt ?? proof.description ?? ''
  const answerIndex = edited.answerIndex !== undefined ? edited.answerIndex : (proof.answer ?? 0)
  const e = existing && typeof existing === 'object' ? existing : {}
  const patch = { [typeKey(e)]: 'multiple-choice', prompt }
  if (Array.isArray(edited.subquestions) && edited.subquestions.length > 0) {
    patch.subquestions = edited.subquestions.map((sq) => ({
      ...(sq && typeof sq === 'object' ? sq : {}),
      prompt: sq?.prompt ?? '',
      choices: Array.isArray(sq?.choices) ? sq.choices : [],
      answerIndex: getSingleSelectAnswerIndex(sq),
    }))
  } else if (Array.isArray(e.subquestions) && e.subquestions.length > 0) {
    patch.subquestions = e.subquestions.map((sq, i) =>
      i === 0 ? { ...sq, choices, answerIndex: Number(answerIndex) } : sq
    )
  } else {
    patch.choices = choices
    // blank boxes and answers past the last choice can never be picked so they stay out of the key
    const answers = normalizeAnswerIndices(
      Array.isArray(edited.answerIndices) ? edited.answerIndices : [answerIndex],
      choices.length
    )
    if (answers.length > 1) {
      patch.multiSelect = true
      patch.answerIndices = answers
    } else {
      patch.answerIndex = answers[0] ?? null
      // one answer box makes the question single choice again
      if (hasNonEmptyAnswerIndices(e) || e.multiSelect) {
        patch.multiSelect = false
        patch.answerIndices = []
      }
    }
  }
  return patch
}

// reads the builder patch because deepMerge keeps an old answerIndex when the new one is null
export function getMcAnswerError(patch) {
  if (Array.isArray(patch.subquestions)) {
    const missing = findQuestionWithoutAnswer(patch.subquestions)
    return missing === -1 ? '' : `Select a correct answer for subquestion ${missing + 1}`
  }
  return hasAnswerKey(patch) ? '' : 'Select a correct answer'
}

export function McEditorForm({ proof, value, onChange }) {
  const mc = proof?.multipleChoice || {}
  const subquestions = Array.isArray(value.subquestions)
    ? value.subquestions
    : (Array.isArray(mc.subquestions) ? mc.subquestions : [])
  const choices = value.choices ?? mc.choices ?? []
  const prompt = value.prompt ?? mc.prompt ?? proof?.description ?? ''
  const answerIndex = value.answerIndex ?? proof?.answer ?? 0
  const answerIndices = (Array.isArray(value.answerIndices) ? value.answerIndices : [answerIndex])
    .map((answer) => (answer == null || answer === '' ? null : Number(answer)))

  const setChoices = (next) => onChange({ ...value, choices: next })
  const setPrompt = (v) => onChange({ ...value, prompt: v })
  const setSubquestions = (next) => onChange({ ...value, subquestions: next })

  const addSubquestion = () => {
    const next = [...subquestions, { prompt: '', choices: ['', ''], answerIndex: 0 }]
    setSubquestions(next)
  }
  const removeSubquestion = (idx) => setSubquestions(subquestions.filter((_, i) => i !== idx))
  const updateSubquestion = (idx, updates) => {
    const next = [...subquestions]
    next[idx] = { ...(next[idx] || {}), ...updates }
    setSubquestions(next)
  }
  const addSubquestionChoice = (qIdx) => {
    const q = subquestions[qIdx] || {}
    const nextChoices = [...(Array.isArray(q.choices) ? q.choices : []), '']
    updateSubquestion(qIdx, { choices: nextChoices })
  }
  const removeSubquestionChoice = (qIdx, cIdx) => {
    const q = subquestions[qIdx] || {}
    const [answerIndex = null] = removeChoiceFromAnswers([getSingleSelectAnswerIndex(q)], cIdx)
    updateSubquestion(qIdx, {
      choices: (Array.isArray(q.choices) ? q.choices : []).filter((_, i) => i !== cIdx),
      answerIndex,
    })
  }
  const updateSubquestionChoice = (qIdx, cIdx, text) => {
    const q = subquestions[qIdx] || {}
    const nextChoices = [...(Array.isArray(q.choices) ? q.choices : [''])]
    nextChoices[cIdx] = text
    updateSubquestion(qIdx, { choices: nextChoices })
  }

  const addChoice = () => setChoices([...choices, ''])
  const removeChoice = (idx) => {
    const nextAnswers = removeChoiceFromAnswers(answerIndices, idx)
    onChange({
      ...value,
      choices: choices.filter((_, i) => i !== idx),
      answerIndices: nextAnswers.length > 0 ? nextAnswers : [null],
    })
  }
  const setAnswerIndices = (next) => onChange({ ...value, answerIndices: next })
  const updateChoice = (idx, text) => {
    const next = [...choices]
    next[idx] = text
    setChoices(next)
  }

  if (subquestions.length > 0) {
    return (
      <Stack spacing={2}>
        <TextField
          label="Prompt"
          multiline
          minRows={2}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          fullWidth
          variant="outlined"
        />
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Subquestions</Typography>
          {subquestions.map((subq, qIdx) => {
            const subChoices = Array.isArray(subq?.choices) && subq.choices.length > 0 ? subq.choices : ['']
            const subAnswerIndex = getSingleSelectAnswerIndex(subq)
            return (
              <Box key={qIdx} sx={{ mb: 2, p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, flexGrow: 1 }}>
                    Subquestion {qIdx + 1}
                  </Typography>
                  <IconButton size="small" onClick={() => removeSubquestion(qIdx)} aria-label="Remove subquestion">
                    <DeleteOutlineIcon />
                  </IconButton>
                </Stack>
                <TextField
                  size="small"
                  label="Prompt"
                  value={subq?.prompt ?? ''}
                  onChange={(e) => updateSubquestion(qIdx, { prompt: e.target.value })}
                  fullWidth
                  sx={{ mb: 1 }}
                />
                <Typography variant="caption" sx={{ display: 'block', mb: 0.5 }}>Choices</Typography>
                {subChoices.map((choice, cIdx) => (
                  <Stack key={`${qIdx}-${cIdx}`} direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                    <TextField
                      size="small"
                      value={choice}
                      onChange={(e) => updateSubquestionChoice(qIdx, cIdx, e.target.value)}
                      fullWidth
                      placeholder={`Choice ${cIdx + 1}`}
                    />
                    <IconButton size="small" onClick={() => removeSubquestionChoice(qIdx, cIdx)} aria-label="Remove choice">
                      <DeleteOutlineIcon />
                    </IconButton>
                  </Stack>
                ))}
                <Button size="small" onClick={() => addSubquestionChoice(qIdx)} sx={{ mb: 1 }}>
                  Add choice
                </Button>
                <FormControl fullWidth size="small">
                  <InputLabel>Correct answer</InputLabel>
                  <Select
                    value={subAnswerIndex !== null && subAnswerIndex < subChoices.length ? String(subAnswerIndex) : ''}
                    label="Correct answer"
                    onChange={(e) => updateSubquestion(qIdx, { answerIndex: Number(e.target.value) })}
                  >
                    {subChoices.map((_, idx) => (
                      <MenuItem key={idx} value={String(idx)}>
                        Choice {idx + 1}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            )
          })}
          <Button startIcon={<AddIcon />} onClick={addSubquestion} size="small">
            Add subquestion
          </Button>
        </Box>
      </Stack>
    )
  }

  return (
    <Stack spacing={2}>
      <TextField
        label="Prompt"
        multiline
        minRows={2}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        fullWidth
        variant="outlined"
      />
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>Choices</Typography>
        {choices.map((choice, idx) => (
          <Stack key={idx} direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
            <TextField
              size="small"
              value={choice}
              onChange={(e) => updateChoice(idx, e.target.value)}
              fullWidth
              placeholder={`Choice ${idx + 1}`}
            />
            <IconButton size="small" onClick={() => removeChoice(idx)} aria-label="Remove choice">
              <DeleteOutlineIcon />
            </IconButton>
          </Stack>
        ))}
        <Button startIcon={<AddIcon />} onClick={addChoice} size="small">
          Add choice
        </Button>
      </Box>
      {answerIndices.map((selectedAnswer, answerNumber) => (
        <Stack key={answerNumber} direction="row" alignItems="center" spacing={1}>
          <FormControl fullWidth size="small">
            <InputLabel>Correct answer</InputLabel>
            <Select
              value={Number.isInteger(selectedAnswer) && selectedAnswer < choices.length ? String(selectedAnswer) : ''}
              label="Correct answer"
              onChange={(e) => setAnswerIndices(answerIndices.map((answer, index) => (
                index === answerNumber ? Number(e.target.value) : answer
              )))}
            >
              {choices.map((_, idx) => (
                <MenuItem key={idx} value={String(idx)}>
                  Choice {idx + 1}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {answerIndices.length > 1 && (
            <IconButton
              size="small"
              onClick={() => setAnswerIndices(answerIndices.filter((_, index) => index !== answerNumber))}
              aria-label={`Remove correct answer ${answerNumber + 1}`}
            >
              <DeleteOutlineIcon />
            </IconButton>
          )}
        </Stack>
      ))}
      <Button size="small" onClick={() => setAnswerIndices([...answerIndices, null])}>
        Add answer
      </Button>
      <Box>
        <Button
          startIcon={<AddIcon />}
          size="small"
          onClick={() => {
            const initialChoices = choices.length ? choices : ['', '']
            setSubquestions([{
              prompt: prompt || '',
              choices: initialChoices,
              answerIndex: Number(answerIndex ?? 0),
            }])
          }}
        >
          Add subquestion mode
        </Button>
      </Box>
    </Stack>
  )
}

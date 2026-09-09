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
import { typeKey } from './snapshotUtils.js'

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
      answerIndex: Number(sq?.answerIndex ?? sq?.answer ?? 0),
    }))
  } else if (Array.isArray(e.subquestions) && e.subquestions.length > 0) {
    patch.subquestions = e.subquestions.map((sq, i) =>
      i === 0 ? { ...sq, choices, answerIndex: Number(answerIndex) } : sq
    )
  } else {
    patch.choices = choices
    if (Array.isArray(edited.answerIndices) && edited.answerIndices.length > 1) {
      patch.multiSelect = true
      patch.answerIndices = edited.answerIndices
      patch.answerIndex = undefined
    } else {
      patch.answerIndex = Number(edited.answerIndices?.[0] ?? answerIndex)
    }
  }
  return patch
}

export function McEditorForm({ proof, value, onChange }) {
  const mc = proof?.multipleChoice || {}
  const subquestions = Array.isArray(value.subquestions)
    ? value.subquestions
    : (Array.isArray(mc.subquestions) ? mc.subquestions : [])
  const choices = value.choices ?? mc.choices ?? []
  const prompt = value.prompt ?? mc.prompt ?? proof?.description ?? ''
  const answerIndex = value.answerIndex ?? proof?.answer ?? 0
  const answerIndices = Array.isArray(value.answerIndices) ? value.answerIndices : [Number(answerIndex)]

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
    const nextChoices = (Array.isArray(q.choices) ? q.choices : []).filter((_, i) => i !== cIdx)
    const nextAnswerIndex = Number(q.answerIndex ?? q.answer ?? 0)
    updateSubquestion(qIdx, {
      choices: nextChoices,
      answerIndex: nextChoices.length === 0 ? 0 : Math.min(nextAnswerIndex, nextChoices.length - 1),
    })
  }
  const updateSubquestionChoice = (qIdx, cIdx, text) => {
    const q = subquestions[qIdx] || {}
    const nextChoices = [...(Array.isArray(q.choices) ? q.choices : [''])]
    nextChoices[cIdx] = text
    updateSubquestion(qIdx, { choices: nextChoices })
  }

  const addChoice = () => setChoices([...choices, ''])
  const removeChoice = (idx) => setChoices(choices.filter((_, i) => i !== idx))
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
            const subAnswerIndex = Number(subq?.answerIndex ?? subq?.answer ?? 0)
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
                    value={String(Math.max(0, Math.min(subAnswerIndex, subChoices.length - 1)))}
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
        <FormControl key={answerNumber} fullWidth size="small">
          <InputLabel>Correct answer</InputLabel>
          <Select
            value={String(selectedAnswer)}
            label="Correct answer"
            onChange={(e) => onChange({
              ...value,
              answerIndices: answerIndices.map((answer, index) => (
                index === answerNumber ? Number(e.target.value) : answer
              )),
            })}
          >
            {choices.map((_, idx) => (
              <MenuItem key={idx} value={String(idx)}>
                Choice {idx + 1}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      ))}
      <Button size="small" onClick={() => onChange({ ...value, answerIndices: [...answerIndices, 0] })}>
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

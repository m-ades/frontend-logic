import * as React from 'react'
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stack,
  Typography,
  FormControlLabel,
  Checkbox,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
} from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import { fetchJson } from '../../utils/api.js'

function buildMcSnapshot(proof, edited) {
  const mc = proof.multipleChoice || {}
  const choices = edited.choices ?? mc.choices ?? []
  const prompt = edited.prompt ?? mc.prompt ?? proof.description ?? ''
  const answerIndex = edited.answerIndex !== undefined ? edited.answerIndex : (proof.answer ?? 0)
  return {
    type: 'multiple-choice',
    prompt,
    multipleChoice: {
      prompt,
      choices,
    },
    answerIndex: Number(answerIndex),
  }
}

function buildTruthTableSnapshot(proof, edited) {
  const tt = proof.truthTable || {}
  const kind = edited.kind ?? tt.kind ?? 'formula'
  const prompt = edited.prompt ?? tt.prompt ?? proof.description ?? ''
  const options = {
    ...(tt.options || {}),
    ...(edited.partialCredit !== undefined ? { partialCredit: edited.partialCredit } : {}),
    ...(edited.classificationQuestion !== undefined ? { question: edited.classificationQuestion } : {}),
  }
  const truthTable = {
    kind,
    options,
    ...(kind === 'formula' && {
      statement: edited.statement ?? tt.statement ?? tt.formula ?? '',
    }),
    ...(kind === 'equivalence' && {
      left: edited.left ?? tt.left ?? '',
      right: edited.right ?? tt.right ?? '',
    }),
    ...(kind === 'argument' && {
      lefts: Array.isArray(edited.lefts) ? edited.lefts : (tt.lefts || []),
      right: edited.right ?? tt.right ?? '',
    }),
  }
  return {
    type: 'truth-table',
    prompt,
    truthTable,
    options,
  }
}

function McEditorForm({ proof, value, onChange }) {
  const mc = proof?.multipleChoice || {}
  const choices = value.choices ?? mc.choices ?? []
  const prompt = value.prompt ?? mc.prompt ?? proof?.description ?? ''
  const answerIndex = value.answerIndex ?? proof?.answer ?? 0

  const setChoices = (next) => onChange({ ...value, choices: next })
  const setPrompt = (v) => onChange({ ...value, prompt: v })
  const setAnswerIndex = (v) => onChange({ ...value, answerIndex: Number(v) })

  const addChoice = () => setChoices([...choices, ''])
  const removeChoice = (idx) => setChoices(choices.filter((_, i) => i !== idx))
  const updateChoice = (idx, text) => {
    const next = [...choices]
    next[idx] = text
    setChoices(next)
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
      <FormControl fullWidth size="small">
        <InputLabel>Correct answer</InputLabel>
        <Select
          value={String(answerIndex)}
          label="Correct answer"
          onChange={(e) => setAnswerIndex(Number(e.target.value))}
        >
          {choices.map((_, idx) => (
            <MenuItem key={idx} value={String(idx)}>
              Choice {idx + 1}{choices[idx] ? `: ${String(choices[idx]).slice(0, 40)}…` : ''}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Stack>
  )
}

function TruthTableEditorForm({ proof, value, onChange }) {
  const tt = proof?.truthTable || {}
  const kind = value.kind ?? tt.kind ?? 'formula'
  const prompt = value.prompt ?? tt.prompt ?? proof?.description ?? ''
  const statement = value.statement ?? tt.statement ?? tt.formula ?? ''
  const left = value.left ?? tt.left ?? ''
  const right = value.right ?? tt.right ?? ''
  const lefts = Array.isArray(value.lefts) ? value.lefts : (tt.lefts || [''])
  const partialCredit = value.partialCredit ?? tt.options?.partialCredit ?? false
  const classificationQuestion = value.classificationQuestion ?? tt.options?.question ?? false

  const update = (updates) => onChange({ ...value, ...updates })

  return (
    <Stack spacing={2}>
      <TextField
        label="Prompt (optional)"
        multiline
        minRows={1}
        value={prompt}
        onChange={(e) => update({ prompt: e.target.value })}
        fullWidth
        variant="outlined"
        placeholder="e.g. Construct a truth table for the following formula."
      />
      <FormControl fullWidth size="small">
        <InputLabel>Question type</InputLabel>
        <Select
          value={kind}
          label="Question type"
          onChange={(e) => update({ kind: e.target.value })}
        >
          <MenuItem value="formula">Single formula</MenuItem>
          <MenuItem value="equivalence">Equivalence (two formulas)</MenuItem>
          <MenuItem value="argument">Argument (premises + conclusion)</MenuItem>
        </Select>
      </FormControl>

      {kind === 'formula' && (
        <TextField
          label="Formula"
          value={statement}
          onChange={(e) => update({ statement: e.target.value })}
          fullWidth
          variant="outlined"
          placeholder="e.g. (P & Q) → R"
        />
      )}
      {kind === 'equivalence' && (
        <>
          <TextField
            label="Left formula"
            value={left}
            onChange={(e) => update({ left: e.target.value })}
            fullWidth
            variant="outlined"
          />
          <TextField
            label="Right formula"
            value={right}
            onChange={(e) => update({ right: e.target.value })}
            fullWidth
            variant="outlined"
          />
        </>
      )}
      {kind === 'argument' && (
        <>
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Premises (one per line)</Typography>
            {(lefts.length ? lefts : ['']).map((line, idx) => (
              <Stack key={idx} direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                <TextField
                  size="small"
                  value={line}
                  onChange={(e) => {
                    const next = [...(lefts.length ? lefts : [''])]
                    next[idx] = e.target.value
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
            onChange={(e) => update({ right: e.target.value })}
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
        label="Ask classification (tautology / valid / etc.)"
      />
    </Stack>
  )
}

const SUPPORTED_TYPES = new Set(['multiple-choice', 'truth-table'])

export default function InstructorQuestionEditor({
  proof,
  isInstructorView,
  onSaved,
}) {
  const [open, setOpen] = React.useState(false)
  const [editValue, setEditValue] = React.useState({})
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState('')

  const questionId = proof?.questionId
  const supported = proof?.type && SUPPORTED_TYPES.has(proof.type)

  const handleOpen = () => {
    setEditValue({})
    setError('')
    setOpen(true)
  }

  const handleSave = async () => {
    if (!questionId) return
    setSaving(true)
    setError('')
    try {
      let question_snapshot
      if (proof.type === 'multiple-choice') {
        question_snapshot = buildMcSnapshot(proof, editValue)
      } else if (proof.type === 'truth-table') {
        question_snapshot = buildTruthTableSnapshot(proof, editValue)
      } else {
        setSaving(false)
        return
      }
      await fetchJson(`/api/assignment-questions/${questionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question_snapshot }),
      })
      setOpen(false)
      onSaved?.(questionId)
    } catch (err) {
      setError(err?.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  if (!isInstructorView || !supported) return null

  return (
    <>
      <Button
        size="small"
        startIcon={<EditIcon />}
        onClick={handleOpen}
        variant="outlined"
        color="primary"
        sx={{ mb: 1 }}
      >
        Edit question
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit question</DialogTitle>
        <DialogContent>
          {error && (
            <Typography color="error" sx={{ mb: 2 }}>
              {error}
            </Typography>
          )}
          {proof.type === 'multiple-choice' && (
            <McEditorForm proof={proof} value={editValue} onChange={setEditValue} />
          )}
          {proof.type === 'truth-table' && (
            <TruthTableEditorForm proof={proof} value={editValue} onChange={setEditValue} />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

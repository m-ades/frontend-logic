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
  Radio,
  RadioGroup,
} from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import { fetchJson } from '../../utils/api.js'

// deep merge. source overwrites. arrays replace.
function deepMerge(target, source) {
  if (source == null) return target
  if (Array.isArray(source)) return source
  if (typeof source !== 'object') return source
  const existing = target != null && typeof target === 'object' && !Array.isArray(target) ? target : {}
  const out = { ...existing }
  for (const key of Object.keys(source)) {
    out[key] = deepMerge(out[key], source[key])
  }
  return out
}

// use same type key as existing snapshot to preserve shape
function typeKey(existing) {
  const e = existing && typeof existing === 'object' ? existing : {}
  return e.logic_problem_type !== undefined ? 'logic_problem_type' : (e.type !== undefined ? 'type' : 'logic_problem_type')
}

function buildMcSnapshot(proof, edited, existing) {
  const mc = proof.multipleChoice || {}
  const choices = edited.choices ?? mc.choices ?? []
  const prompt = edited.prompt ?? mc.prompt ?? proof.description ?? ''
  const answerIndex = edited.answerIndex !== undefined ? edited.answerIndex : (proof.answer ?? 0)
  const e = existing && typeof existing === 'object' ? existing : {}
  const patch = { [typeKey(e)]: 'multiple-choice', prompt }
  if (Array.isArray(e.subquestions) && e.subquestions.length > 0) {
    patch.subquestions = e.subquestions.map((sq, i) =>
      i === 0 ? { ...sq, choices, answerIndex: Number(answerIndex) } : sq
    )
  } else {
    patch.multipleChoice = { prompt, choices }
    patch.answerIndex = Number(answerIndex)
  }
  return patch
}

function buildTruthTableSnapshot(proof, edited, existing) {
  const tt = proof.truthTable || {}
  const e = existing && typeof existing === 'object' ? existing : {}
  const kind = edited.kind ?? tt.kind ?? 'formula'
  const prompt = edited.prompt ?? tt.prompt ?? proof.description ?? ''
  const options = {
    ...(tt.options || {}),
    ...(edited.partialCredit !== undefined ? { partialCredit: edited.partialCredit } : {}),
    ...(edited.classificationQuestion !== undefined ? { question: edited.classificationQuestion } : {}),
  }
  const truthTableData = {
    kind,
    options,
    ...(kind === 'formula' && { statement: edited.statement ?? tt.statement ?? tt.formula ?? '' }),
    ...(kind === 'equivalence' && { left: edited.left ?? tt.left ?? '', right: edited.right ?? tt.right ?? '' }),
    ...(kind === 'argument' && { lefts: Array.isArray(edited.lefts) ? edited.lefts : (tt.lefts || []), right: edited.right ?? tt.right ?? '' }),
  }
  const patch = { [typeKey(e)]: 'truth-table', prompt, options }
  const ttKey = e.truth_table !== undefined ? 'truth_table' : 'truthTable'
  patch[ttKey] = deepMerge(e[ttKey], truthTableData)
  return patch
}

function buildIndirectTruthTableSnapshot(proof, edited, existing) {
  const itt = proof.indirectTruthTable || {}
  const e = existing && typeof existing === 'object' ? existing : {}
  const prompt = edited.prompt ?? itt.prompt ?? proof.description ?? ''
  const argument = edited.argument ?? itt.argument ?? {}
  const questions = Array.isArray(edited.questions) ? edited.questions : (itt.questions || itt.subquestions || [])
  return {
    [typeKey(e)]: 'indirect-truth-table',
    prompt,
    argument,
    questions,
    subquestions: questions,
  }
}

function buildDerivationSnapshot(proof, edited, existing) {
  const e = existing && typeof existing === 'object' ? existing : {}
  const prems = edited.premises ?? proof.premises ?? proof.prems ?? []
  const conclusion = edited.conclusion ?? proof.conclusion ?? proof.conc ?? ''
  const prompt = edited.prompt ?? proof.description ?? ''
  const patch = { [typeKey(e)]: proof.type || 'derivation', prompt, description: prompt, prems, conc: conclusion }
  if (e.premises !== undefined) patch.premises = prems
  if (e.conclusion !== undefined) patch.conclusion = conclusion
  return patch
}

function AttemptLimitField({ value, onChange }) {
  const num = value != null && Number.isFinite(Number(value)) ? Number(value) : 3
  return (
    <TextField
      type="number"
      label="Attempt limit"
      value={num}
      onChange={(e) => {
        const v = parseInt(e.target.value, 10)
        onChange(Number.isFinite(v) && v >= 0 ? v : num)
      }}
      inputProps={{ min: 0, step: 1 }}
      size="small"
      fullWidth
    />
  )
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
          <MenuItem value="formula">Single statement</MenuItem>
          <MenuItem value="equivalence">Equivalence</MenuItem>
          <MenuItem value="argument">Argument</MenuItem>
        </Select>
      </FormControl>

      {kind === 'formula' && (
        <TextField
          label="Statement"
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
            label="Left statement"
            value={left}
            onChange={(e) => update({ left: e.target.value })}
            fullWidth
            variant="outlined"
          />
          <TextField
            label="Right statement"
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
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Premises</Typography>
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
        label="Ask classification"
      />
    </Stack>
  )
}

function IndirectTruthTableEditorForm({ proof, value, onChange }) {
  const itt = proof?.indirectTruthTable || {}
  const prompt = value.prompt ?? itt.prompt ?? proof?.description ?? ''
  const argument = value.argument ?? itt.argument ?? {}
  const premises = Array.isArray(argument.premises) ? argument.premises : (argument.premises ? [argument.premises] : [])
  const conclusion = argument.conclusion ?? ''
  const questions = Array.isArray(value.questions) ? value.questions : (itt.questions || itt.subquestions || [])

  const update = (updates) => onChange({ ...value, ...updates })
  const setArgument = (arg) => update({ argument: { ...argument, ...arg } })

  const setPremises = (prems) => setArgument({ premises: prems })
  const setConclusion = (c) => setArgument({ conclusion: c })
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
                next[idx] = e.target.value
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
        onChange={(e) => setArgument({ conclusion: e.target.value })}
        fullWidth
        variant="outlined"
      />
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>Questions</Typography>
        {(questions.length ? questions : [{ prompt: '', choices: [], answerIndex: 0 }]).map((q, qIdx) => (
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
                <IconButton size="small" onClick={() => updateQuestion(qIdx, { choices: (q.choices || []).filter((_, i) => i !== cIdx) })}>
                  <DeleteOutlineIcon />
                </IconButton>
              </Stack>
            ))}
            <Button size="small" onClick={() => updateQuestion(qIdx, { choices: [...(q.choices || []), ''] })}>Add choice</Button>
            <FormControl fullWidth size="small" sx={{ mt: 1 }}>
              <InputLabel>Correct answer</InputLabel>
              <Select
                value={String(q.answerIndex ?? q.answer ?? 0)}
                label="Correct answer"
                onChange={(e) => updateQuestion(qIdx, { answerIndex: Number(e.target.value) })}
              >
                {(q.choices || []).map((_, i) => (
                  <MenuItem key={i} value={String(i)}>Choice {i + 1}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        ))}
        <Button size="small" startIcon={<AddIcon />} onClick={() => setQuestions([...(questions.length ? questions : []), { prompt: '', choices: [], answerIndex: 0 }])}>
          Add question
        </Button>
      </Box>
    </Stack>
  )
}

function DerivationEditorForm({ proof, value, onChange }) {
  const premises = value.premises ?? proof.premises ?? proof.prems ?? []
  const conclusion = value.conclusion ?? proof.conclusion ?? proof.conc ?? ''
  const prompt = value.prompt ?? proof.description ?? ''

  const update = (updates) => onChange({ ...value, ...updates })
  const premsList = Array.isArray(premises) ? premises : (premises ? [premises] : [])

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
        {(premsList.length ? premsList : ['']).map((line, idx) => (
          <Stack key={idx} direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
            <TextField
              size="small"
              value={line}
              onChange={(e) => {
                const next = [...(premsList.length ? premsList : [''])]
                next[idx] = e.target.value
                update({ premises: next })
              }}
              fullWidth
              placeholder={`Premise ${idx + 1}`}
            />
            <IconButton size="small" onClick={() => update({ premises: premsList.filter((_, i) => i !== idx) })} aria-label="Remove">
              <DeleteOutlineIcon />
            </IconButton>
          </Stack>
        ))}
        <Button size="small" startIcon={<AddIcon />} onClick={() => update({ premises: [...(premsList.length ? premsList : ['']), ''] })}>
          Add premise
        </Button>
      </Box>
      <TextField
        label="Conclusion"
        value={conclusion}
        onChange={(e) => update({ conclusion: e.target.value })}
        fullWidth
        variant="outlined"
      />
    </Stack>
  )
}

function buildTrueFalseSnapshot(proof, edited, existing) {
  const tf = proof.trueFalse || {}
  const e = existing && typeof existing === 'object' ? existing : {}
  const prompt = edited.prompt ?? tf.prompt ?? proof.description ?? ''
  const answer = edited.answer !== undefined ? edited.answer : (proof.answer ?? false)
  const patch = { [typeKey(e)]: 'true-false', prompt, answer: Boolean(answer) }
  if (e.trueFalse !== undefined) patch.trueFalse = { ...e.trueFalse, prompt }
  return patch
}

function buildEvaluateTruthSnapshot(proof, edited, existing) {
  const e = existing && typeof existing === 'object' ? existing : {}
  const statement = edited.statement ?? proof.evaluateTruth ?? proof.description ?? ''
  const answer = edited.answer !== undefined ? edited.answer : (proof.answer ?? false)
  const patch = { [typeKey(e)]: 'evaluate-truth', prompt: statement, statement, answer: Boolean(answer) }
  if (e.evaluateTruth !== undefined) patch.evaluateTruth = statement
  return patch
}

function buildSymbolicTranslationSnapshot(proof, edited, existing) {
  const tr = proof.translation || {}
  const e = existing && typeof existing === 'object' ? existing : {}
  const prompt = edited.prompt ?? tr.prompt ?? proof.description ?? ''
  const legend = edited.legend ?? tr.legend ?? proof.legend ?? ''
  const rawKey = Array.isArray(edited.symbolizationKey) ? edited.symbolizationKey : (tr.symbolizationKey || [])
  const symbolizationKey = rawKey.filter((x) => x != null && String(x).trim() !== '')
  const answer = edited.answer ?? proof.answer ?? tr.answer ?? ''
  const patch = { [typeKey(e)]: 'symbolic-translation', prompt, legend, answer }
  const keyName = e.symbolization_key !== undefined ? 'symbolization_key' : 'symbolizationKey'
  patch[keyName] = symbolizationKey
  return patch
}

function buildSingleRowTruthTableSnapshot(proof, edited, existing) {
  const sr = proof.singleRowTruthTable || {}
  const statement = edited.statement ?? sr.statement ?? sr.formula ?? proof.description ?? ''
  const prompt = edited.prompt ?? sr.prompt ?? proof.description ?? ''
  const interpretation = edited.interpretation ?? sr.interpretation ?? {}
  const interp = typeof interpretation === 'object' && interpretation !== null ? interpretation : {}
  return {
    [typeKey(existing)]: 'single-row-truth-table',
    prompt,
    statement,
    interpretation: interp,
  }
}

function buildPartialTruthTableSnapshot(proof, edited, existing) {
  const pt = proof.partialTruthTable || {}
  const e = existing && typeof existing === 'object' ? existing : {}
  const statement = edited.statement ?? pt.statement ?? pt.formula ?? ''
  const prompt = edited.prompt ?? pt.prompt ?? proof.description ?? ''
  const row = Array.isArray(edited.row) ? edited.row : (pt.row || [])
  return {
    [typeKey(e)]: 'partial-truth-table',
    prompt,
    statement,
    formula: statement,
    row,
  }
}

function buildComboSnapshot(proof, edited, existing, comboTypeKey) {
  const snapshot = proof[comboTypeKey] || proof.snapshot || {}
  const e = existing && typeof existing === 'object' ? existing : {}
  const prompt = edited.prompt ?? snapshot.prompt ?? proof.description ?? ''
  const patch = { [typeKey(e)]: proof.type, prompt }
  if (comboTypeKey === 'comboTranslationTruthTable') {
    const raw = edited.argumentLine ?? edited.answer
    const answer =
      raw != null && raw !== ''
        ? typeof raw === 'string'
          ? { argumentLine: raw }
          : raw
        : proof.answer ?? snapshot.answer
    if (answer != null) patch.answer = answer
  }
  return patch
}

function TrueFalseEditorForm({ proof, value, onChange }) {
  const tf = proof?.trueFalse || {}
  const prompt = value.prompt ?? tf.prompt ?? proof?.description ?? ''
  const answer = value.answer ?? proof?.answer ?? false
  return (
    <Stack spacing={2}>
      <TextField label="Prompt" multiline minRows={2} value={prompt} onChange={(e) => onChange({ ...value, prompt: e.target.value })} fullWidth variant="outlined" />
      <FormControl>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>Correct answer</Typography>
        <RadioGroup row value={answer ? 'true' : 'false'} onChange={(e) => onChange({ ...value, answer: e.target.value === 'true' })}>
          <FormControlLabel value="true" control={<Radio />} label="True" />
          <FormControlLabel value="false" control={<Radio />} label="False" />
        </RadioGroup>
      </FormControl>
    </Stack>
  )
}

function EvaluateTruthEditorForm({ proof, value, onChange }) {
  const statement = value.statement ?? proof?.evaluateTruth ?? proof?.description ?? ''
  const answer = value.answer ?? proof?.answer ?? false
  return (
    <Stack spacing={2}>
      <TextField label="Statement" multiline minRows={1} value={statement} onChange={(e) => onChange({ ...value, statement: e.target.value })} fullWidth variant="outlined" placeholder="e.g. P & Q" />
      <FormControl>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>Correct answer</Typography>
        <RadioGroup row value={answer ? 'true' : 'false'} onChange={(e) => onChange({ ...value, answer: e.target.value === 'true' })}>
          <FormControlLabel value="true" control={<Radio />} label="True" />
          <FormControlLabel value="false" control={<Radio />} label="False" />
        </RadioGroup>
      </FormControl>
    </Stack>
  )
}

function SymbolicTranslationEditorForm({ proof, value, onChange }) {
  const tr = proof?.translation || {}
  const prompt = value.prompt ?? tr.prompt ?? proof?.description ?? ''
  const legend = value.legend ?? tr.legend ?? proof?.legend ?? ''
  const symbolizationKey = Array.isArray(value.symbolizationKey) ? value.symbolizationKey : (tr.symbolizationKey || [])
  const answer = value.answer ?? proof?.answer ?? tr?.answer ?? proof?.solution ?? ''
  const keyList = Array.isArray(symbolizationKey) && symbolizationKey.length > 0 ? symbolizationKey : ['']
  const updateKey = (idx, str) => {
    const next = [...keyList]
    next[idx] = str
    onChange({ ...value, symbolizationKey: next.filter(Boolean) })
  }
  return (
    <Stack spacing={2}>
      <TextField label="Prompt" multiline minRows={2} value={prompt} onChange={(e) => onChange({ ...value, prompt: e.target.value })} fullWidth variant="outlined" />
      <TextField label="Legend" multiline minRows={2} value={typeof legend === 'string' ? legend : ''} onChange={(e) => onChange({ ...value, legend: e.target.value })} fullWidth variant="outlined" placeholder="e.g. P = it is raining" />
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>Symbolization key</Typography>
        {keyList.map((entry, idx) => (
          <Stack key={idx} direction="row" spacing={1} sx={{ mb: 1 }}>
            <TextField size="small" value={typeof entry === 'string' ? entry : (entry?.symbol && entry?.meaning ? `${entry.symbol}: ${entry.meaning}` : '')} onChange={(e) => updateKey(idx, e.target.value)} fullWidth placeholder="P: dogs" />
            <IconButton size="small" onClick={() => onChange({ ...value, symbolizationKey: keyList.filter((_, i) => i !== idx) })}><DeleteOutlineIcon /></IconButton>
          </Stack>
        ))}
        <Button size="small" startIcon={<AddIcon />} onClick={() => onChange({ ...value, symbolizationKey: [...keyList, ''] })}>Add line</Button>
      </Box>
      <TextField label="Correct answer" value={answer} onChange={(e) => onChange({ ...value, answer: e.target.value })} fullWidth variant="outlined" placeholder="e.g. P & Q" />
    </Stack>
  )
}

function SingleRowTruthTableEditorForm({ proof, value, onChange }) {
  const sr = proof?.singleRowTruthTable || {}
  const statement = value.statement ?? sr.statement ?? proof?.description ?? ''
  const prompt = value.prompt ?? sr.prompt ?? proof?.description ?? ''
  return (
    <Stack spacing={2}>
      <TextField label="Statement" value={statement} onChange={(e) => onChange({ ...value, statement: e.target.value })} fullWidth variant="outlined" />
      <TextField label="Prompt" multiline minRows={1} value={prompt} onChange={(e) => onChange({ ...value, prompt: e.target.value })} fullWidth variant="outlined" />
    </Stack>
  )
}

function PartialTruthTableEditorForm({ proof, value, onChange }) {
  const pt = proof?.partialTruthTable || {}
  const statement = value.statement ?? pt.statement ?? pt.formula ?? proof?.description ?? ''
  const prompt = value.prompt ?? pt.prompt ?? proof?.description ?? ''
  const rowStr = Array.isArray(value.row) ? value.row.map((v) => (v === true || v === 'T' ? 'T' : v === false || v === 'F' ? 'F' : '')).join(',') : (Array.isArray(pt.row) ? pt.row.map((v) => (v === true ? 'T' : v === false ? 'F' : '')).join(',') : '')
  const setRow = (str) => {
    const arr = str ? str.split(',').map((c) => (c.trim() === 'T' ? true : c.trim() === 'F' ? false : null)) : []
    onChange({ ...value, row: arr })
  }
  return (
    <Stack spacing={2}>
      <TextField label="Statement" value={statement} onChange={(e) => onChange({ ...value, statement: e.target.value })} fullWidth variant="outlined" />
      <TextField label="Prompt" value={prompt} onChange={(e) => onChange({ ...value, prompt: e.target.value })} fullWidth variant="outlined" />
      <TextField label="Given row" value={rowStr} onChange={(e) => setRow(e.target.value)} fullWidth variant="outlined" placeholder="T, F, , T" />
    </Stack>
  )
}

function ComboPromptEditorForm({ proof, value, onChange, label = 'Prompt' }) {
  const snapshot = proof?.comboTranslationTruthTable || proof?.comboTranslationDerivation || proof?.snapshot || {}
  const prompt = value.prompt ?? snapshot.prompt ?? proof?.description ?? ''
  return (
    <TextField label={label} multiline minRows={2} value={prompt} onChange={(e) => onChange({ ...value, prompt: e.target.value })} fullWidth variant="outlined" />
  )
}

function ComboTruthTableEditorForm({ proof, value, onChange }) {
  const snapshot = proof?.comboTranslationTruthTable || proof?.snapshot || {}
  const prompt = value.prompt ?? snapshot.prompt ?? proof?.description ?? ''
  const answerObj = proof?.answer ?? snapshot?.answer
  const argumentLine =
    value.argumentLine ??
    (typeof answerObj === 'string' ? answerObj : answerObj?.argumentLine ?? answerObj?.argument ?? '')
  return (
    <Stack spacing={2}>
      <TextField label="Prompt" multiline minRows={2} value={prompt} onChange={(e) => onChange({ ...value, prompt: e.target.value })} fullWidth variant="outlined" />
      <TextField
        label="Expected argument"
        value={argumentLine}
        onChange={(e) => onChange({ ...value, argumentLine: e.target.value })}
        fullWidth
        variant="outlined"
        placeholder="P ⊃ Q / P // Q"
      />
    </Stack>
  )
}

const SUPPORTED_TYPES = new Set([
  'multiple-choice',
  'truth-table',
  'indirect-truth-table',
  'derivation',
  'derivation-hurley',
  'true-false',
  'evaluate-truth',
  'symbolic-translation',
  'single-row-truth-table',
  'partial-truth-table',
  'combo-translation-truth-table',
  'combo-translation-derivation',
])

function InstructorQuestionEditorInner({
  proof,
  isInstructorView,
  onSaved,
  trigger = 'button',
  forwardedRef,
}) {
  const [open, setOpen] = React.useState(false)
  const [editValue, setEditValue] = React.useState({})
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState('')
  const initialEditValueRef = React.useRef(null)

  const questionId = proof?.questionId
  const supported = proof?.type && SUPPORTED_TYPES.has(proof.type)

  const handleOpen = React.useCallback(() => {
    const base = { attemptLimit: proof?.attemptLimit ?? 3 }
    if (proof?.type === 'multiple-choice') {
      const mc = proof.multipleChoice || {}
      base.prompt = mc.prompt ?? proof.description ?? ''
      base.choices = Array.isArray(mc.choices) ? [...mc.choices] : []
      base.answerIndex = proof.answer ?? 0
    }
    if (proof?.type === 'symbolic-translation') {
      const tr = proof.translation || {}
      base.prompt = proof.description ?? tr.prompt ?? ''
      base.legend = tr.legend ?? proof.legend ?? ''
      base.symbolizationKey = Array.isArray(tr.symbolizationKey) ? [...tr.symbolizationKey] : []
      base.answer = tr.answer ?? proof.answer ?? ''
    }
    if (proof?.type === 'truth-table') {
      const tt = proof.truthTable || {}
      base.prompt = tt.prompt ?? proof.description ?? ''
      base.kind = tt.kind ?? 'formula'
      base.statement = tt.statement ?? tt.formula ?? ''
      base.left = tt.left ?? ''
      base.right = tt.right ?? ''
      base.lefts = Array.isArray(tt.lefts) ? [...tt.lefts] : []
      base.partialCredit = tt.options?.partialCredit ?? false
      base.classificationQuestion = tt.options?.question ?? false
    }
    if (proof?.type === 'indirect-truth-table') {
      const itt = proof.indirectTruthTable || {}
      base.prompt = itt.prompt ?? proof.description ?? ''
      base.argument = itt.argument ? { ...itt.argument } : {}
      base.questions = Array.isArray(itt.questions) ? itt.questions.map((q) => ({ ...q })) : (Array.isArray(itt.subquestions) ? itt.subquestions.map((q) => ({ ...q })) : [])
    }
    if (proof?.type === 'derivation' || proof?.type === 'derivation-hurley') {
      base.prompt = proof.description ?? ''
      base.premises = Array.isArray(proof.premises) ? [...proof.premises] : (Array.isArray(proof.prems) ? [...proof.prems] : [])
      base.conclusion = proof.conclusion ?? proof.conc ?? ''
    }
    if (proof?.type === 'true-false') {
      const tf = proof.trueFalse || {}
      base.prompt = tf.prompt ?? proof.description ?? ''
      base.answer = proof.answer ?? false
    }
    if (proof?.type === 'evaluate-truth') {
      base.statement = proof.evaluateTruth ?? proof.description ?? ''
      base.answer = proof.answer ?? false
    }
    if (proof?.type === 'single-row-truth-table') {
      const sr = proof.singleRowTruthTable || {}
      base.statement = sr.statement ?? sr.formula ?? proof.description ?? ''
      base.prompt = sr.prompt ?? proof.description ?? ''
      base.interpretation = typeof sr.interpretation === 'object' && sr.interpretation !== null ? { ...sr.interpretation } : {}
    }
    if (proof?.type === 'partial-truth-table') {
      const pt = proof.partialTruthTable || {}
      base.statement = pt.statement ?? pt.formula ?? proof.description ?? ''
      base.prompt = pt.prompt ?? proof.description ?? ''
      base.row = Array.isArray(pt.row) ? [...pt.row] : []
    }
    if (proof?.type === 'combo-translation-truth-table') {
      const snap = proof.comboTranslationTruthTable || proof.snapshot || {}
      base.prompt = snap.prompt ?? proof.description ?? ''
      const ans = proof.answer ?? snap.answer
      base.argumentLine = typeof ans === 'string' ? ans : ans?.argumentLine ?? ans?.argument ?? ''
    }
    if (proof?.type === 'combo-translation-derivation') {
      const snap = proof.comboTranslationDerivation || proof.snapshot || {}
      base.prompt = snap.prompt ?? proof.description ?? ''
      const ans = proof.answer ?? snap.answer
      base.argumentLine = typeof ans === 'string' ? ans : ans?.argumentLine ?? ans?.argument ?? ''
    }
    setEditValue(base)
    initialEditValueRef.current = JSON.parse(JSON.stringify(base))
    setError('')
    setOpen(true)
  }, [
    proof?.attemptLimit,
    proof?.type,
    proof?.description,
    proof?.answer,
    proof?.translation,
    proof?.legend,
    proof?.multipleChoice,
    proof?.truthTable,
    proof?.indirectTruthTable,
    proof?.premises,
    proof?.prems,
    proof?.conclusion,
    proof?.conc,
    proof?.trueFalse,
    proof?.evaluateTruth,
    proof?.singleRowTruthTable,
    proof?.partialTruthTable,
    proof?.comboTranslationTruthTable,
    proof?.comboTranslationDerivation,
    proof?.snapshot,
  ])

  React.useImperativeHandle(forwardedRef, () => ({
    open: handleOpen,
  }), [handleOpen])

  const handleSave = async () => {
    if (!questionId) return
    setSaving(true)
    setError('')
    try {
      const existingSnapshot = proof?.questionSnapshot ?? {}
      const existing = typeof existingSnapshot === 'object' && existingSnapshot !== null ? existingSnapshot : {}
      let question_snapshot
      if (proof.type === 'multiple-choice') {
        question_snapshot = buildMcSnapshot(proof, editValue, existing)
      } else if (proof.type === 'truth-table') {
        question_snapshot = buildTruthTableSnapshot(proof, editValue, existing)
      } else if (proof.type === 'indirect-truth-table') {
        question_snapshot = buildIndirectTruthTableSnapshot(proof, editValue, existing)
      } else if (proof.type === 'derivation' || proof.type === 'derivation-hurley') {
        question_snapshot = buildDerivationSnapshot(proof, editValue, existing)
      } else if (proof.type === 'true-false') {
        question_snapshot = buildTrueFalseSnapshot(proof, editValue, existing)
      } else if (proof.type === 'evaluate-truth') {
        question_snapshot = buildEvaluateTruthSnapshot(proof, editValue, existing)
      } else if (proof.type === 'symbolic-translation') {
        question_snapshot = buildSymbolicTranslationSnapshot(proof, editValue, existing)
      } else if (proof.type === 'single-row-truth-table') {
        question_snapshot = buildSingleRowTruthTableSnapshot(proof, editValue, existing)
      } else if (proof.type === 'partial-truth-table') {
        question_snapshot = buildPartialTruthTableSnapshot(proof, editValue, existing)
      } else if (proof.type === 'combo-translation-truth-table') {
        question_snapshot = buildComboSnapshot(proof, editValue, existing, 'comboTranslationTruthTable')
      } else if (proof.type === 'combo-translation-derivation') {
        question_snapshot = buildComboSnapshot(proof, editValue, existing, 'comboTranslationDerivation')
      } else {
        setSaving(false)
        return
      }
      const mergedSnapshot = deepMerge(existing, question_snapshot)
      const omitAttemptLimit = (v) => {
        const { attemptLimit: _, ...rest } = v || {}
        return rest
      }
      const formChanged =
        initialEditValueRef.current != null &&
        JSON.stringify(omitAttemptLimit(editValue)) !== JSON.stringify(omitAttemptLimit(initialEditValueRef.current))
      const body = {}
      const attemptLimit = editValue.attemptLimit
      if (attemptLimit !== undefined && Number.isFinite(Number(attemptLimit))) {
        body.attempt_limit = Number(attemptLimit)
      }
      if (formChanged) {
        body.question_snapshot = mergedSnapshot
      }
      if (Object.keys(body).length === 0) {
        setSaving(false)
        return
      }
      await fetchJson(`/api/assignment-questions/${questionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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

  const triggerEl =
    trigger === 'pencil' ? (
      <Box
        component="span"
        onClick={handleOpen}
        role="button"
        aria-label="Edit question"
        sx={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer', color: 'text.secondary', '&:hover': { opacity: 0.8 } }}
      >
        <EditIcon fontSize="small" />
      </Box>
    ) : trigger === 'button' ? (
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
    ) : null

  return (
    <>
      {triggerEl}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit question</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            {error && (
              <Typography color="error">
                {error}
              </Typography>
            )}
            <AttemptLimitField
              value={editValue.attemptLimit ?? proof?.attemptLimit ?? 3}
              onChange={(v) => setEditValue((prev) => ({ ...prev, attemptLimit: v }))}
            />
            {proof.type === 'multiple-choice' && (
              <McEditorForm proof={proof} value={editValue} onChange={setEditValue} />
            )}
            {proof.type === 'truth-table' && (
              <TruthTableEditorForm proof={proof} value={editValue} onChange={setEditValue} />
            )}
            {proof.type === 'indirect-truth-table' && (
              <IndirectTruthTableEditorForm proof={proof} value={editValue} onChange={setEditValue} />
            )}
            {(proof.type === 'derivation' || proof.type === 'derivation-hurley') && (
              <DerivationEditorForm proof={proof} value={editValue} onChange={setEditValue} />
            )}
            {proof.type === 'true-false' && (
              <TrueFalseEditorForm proof={proof} value={editValue} onChange={setEditValue} />
            )}
            {proof.type === 'evaluate-truth' && (
              <EvaluateTruthEditorForm proof={proof} value={editValue} onChange={setEditValue} />
            )}
            {proof.type === 'symbolic-translation' && (
              <SymbolicTranslationEditorForm proof={proof} value={editValue} onChange={setEditValue} />
            )}
            {proof.type === 'single-row-truth-table' && (
              <SingleRowTruthTableEditorForm proof={proof} value={editValue} onChange={setEditValue} />
            )}
            {proof.type === 'partial-truth-table' && (
              <PartialTruthTableEditorForm proof={proof} value={editValue} onChange={setEditValue} />
            )}
            {proof.type === 'combo-translation-truth-table' && (
              <ComboTruthTableEditorForm proof={proof} value={editValue} onChange={setEditValue} />
            )}
            {proof.type === 'combo-translation-derivation' && (
              <ComboPromptEditorForm proof={proof} value={editValue} onChange={setEditValue} label="Prompt" />
            )}
          </Stack>
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

const InstructorQuestionEditor = React.forwardRef(function InstructorQuestionEditor(
  { proof, isInstructorView, onSaved, trigger = 'button' },
  ref
) {
  return (
    <InstructorQuestionEditorInner
      proof={proof}
      isInstructorView={isInstructorView}
      onSaved={onSaved}
      trigger={trigger}
      forwardedRef={ref}
    />
  )
})

export default InstructorQuestionEditor

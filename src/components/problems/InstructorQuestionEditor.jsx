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
import getFormulaClass from '../../lib/logicpenguin/symbolic/formula.js'
import getSyntax from '../../lib/logicpenguin/symbolic/libsyntax.js'
import {
  DEFAULT_LOGIC_SYSTEM,
  getNotation,
  getSymbols,
  isDerivationProblemType,
  normalizeLogicSystem,
} from '../../lib/logicSystems.js'
import {
  FORCE_UPPER_DERIVATION_RULES,
  formatDerivationRuleName,
  getDerivationRuleLookup,
  getDerivationRules,
} from '../../lib/derivationRules.js'
import { displayIndexedSymbolsForNotation } from '../../lib/indexedSymbols.js'

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

function normalizeFormulaInput(value, logicSystem = DEFAULT_LOGIC_SYSTEM) {
  return getSyntax(getNotation(logicSystem)).inputfix(String(value ?? '')).trim()
}

function displayFormulaInput(value, logicSystem = DEFAULT_LOGIC_SYSTEM) {
  const notation = getNotation(logicSystem)
  return displayIndexedSymbolsForNotation(
    getSyntax(notation).inputfix(String(value ?? '')),
    notation
  ).trim()
}

function normalizeFormulaInputs(values, logicSystem = DEFAULT_LOGIC_SYSTEM) {
  return (Array.isArray(values) ? values : (values ? [values] : [])).map((value) => normalizeFormulaInput(value, logicSystem))
}

function normalizeArgumentInput(argument, logicSystem = DEFAULT_LOGIC_SYSTEM) {
  const out = { ...(argument && typeof argument === 'object' ? argument : {}) }
  if (out.premises !== undefined) out.premises = normalizeFormulaInputs(out.premises, logicSystem)
  if (out.conclusion !== undefined) out.conclusion = normalizeFormulaInput(out.conclusion, logicSystem)
  return out
}

function validateFormulaInput(value, logicSystem, label) {
  const text = String(value ?? '').trim()
  if (!text) return ''
  const Formula = getFormulaClass(getNotation(logicSystem))
  const formula = Formula.from(text)
  if (formula.wellformed) return ''
  return `${label}: ${formula.syntaxerrors || 'invalid formula'}`
}

function validateFormulaInputs(values, logicSystem, label) {
  const list = Array.isArray(values) ? values : (values ? [values] : [])
  for (let i = 0; i < list.length; i += 1) {
    const error = validateFormulaInput(list[i], logicSystem, `${label} ${i + 1}`)
    if (error) return error
  }
  return ''
}

function validateArgumentInput(argument, logicSystem, label = 'Argument') {
  const premises = argument?.premises ?? argument?.prems
  const conclusion = argument?.conclusion ?? argument?.conc
  return validateFormulaInputs(premises, logicSystem, `${label} premise`)
    || validateFormulaInput(conclusion, logicSystem, `${label} conclusion`)
}

function validateArgumentLineInput(value, logicSystem, label = 'Expected argument') {
  const text = String(value ?? '').trim()
  if (!text) return ''
  const parts = text.split('//')
  if (parts.length !== 2) {
    return validateFormulaInput(text, logicSystem, label)
  }
  const premises = parts[0].split('/').map((part) => part.trim()).filter(Boolean)
  const conclusion = parts[1].trim()
  return validateFormulaInputs(premises, logicSystem, `${label} premise`)
    || validateFormulaInput(conclusion, logicSystem, `${label} conclusion`)
}

function validateQuestionSnapshotFormulas(snapshot, logicSystem = DEFAULT_LOGIC_SYSTEM) {
  const type = snapshot?.logic_problem_type || snapshot?.type || snapshot?.problemType
  if (type === 'truth-table') {
    const tt = snapshot.truthTable || snapshot.truth_table || {}
    if (tt.kind === 'equivalence') {
      return validateFormulaInput(tt.left, logicSystem, 'Left statement')
        || validateFormulaInput(tt.right, logicSystem, 'Right statement')
    }
    if (tt.kind === 'argument') {
      return validateFormulaInputs(tt.lefts, logicSystem, 'Premise')
        || validateFormulaInput(tt.right, logicSystem, 'Conclusion')
    }
    return validateFormulaInput(tt.statement ?? tt.formula, logicSystem, 'Statement')
  }
  if (type === 'indirect-truth-table' || type === 'nonclassical-truth-table') {
    return validateArgumentInput(snapshot.argument, logicSystem)
  }
  if (isDerivationProblemType(type)) {
    return validateFormulaInputs(snapshot.prems ?? snapshot.premises, logicSystem, 'Premise')
      || validateFormulaInput(snapshot.conc ?? snapshot.conclusion, logicSystem, 'Conclusion')
  }
  if (type === 'evaluate-truth') {
    return validateFormulaInput(snapshot.statement ?? snapshot.prompt, logicSystem, 'Statement')
  }
  if (type === 'symbolic-translation') {
    return validateFormulaInput(snapshot.answer, logicSystem, 'Correct answer')
  }
  if (type === 'single-row-truth-table' || type === 'partial-truth-table') {
    return validateFormulaInput(snapshot.statement ?? snapshot.formula, logicSystem, 'Statement')
  }
  if (type === 'combo-translation-truth-table' || type === 'combo-translation-derivation') {
    const answer = snapshot.answer
    if (Array.isArray(answer?.premises) || answer?.conclusion !== undefined) {
      return validateArgumentInput(answer, logicSystem, 'Expected argument')
    }
    if (Array.isArray(answer?.translations)) {
      return validateFormulaInputs(answer.translations, logicSystem, 'Expected translation')
    }
    const argument = typeof answer === 'string' ? answer : (answer?.argumentLine ?? answer?.argument)
    return validateArgumentLineInput(argument, logicSystem)
  }
  if (type === 'proof-argument-extraction') {
    return validateFormulaInputs(snapshot.prems, logicSystem, 'Premise')
      || validateFormulaInputs(snapshot.lines, logicSystem, 'Proof line')
  }
  return ''
}

function normalizeRuleToken(token, logicSystem = DEFAULT_LOGIC_SYSTEM) {
  const raw = String(token || '').trim()
  if (!raw) return ''
  const ruleLookup = getDerivationRuleLookup(logicSystem)
  const fromLookup = ruleLookup.get(raw.toLowerCase())
  if (fromLookup) return fromLookup
  const formatted = formatDerivationRuleName(raw)
  const fromFormatted = ruleLookup.get(formatted.toLowerCase())
  if (fromFormatted) return fromFormatted
  const upper = raw.toUpperCase()
  if (FORCE_UPPER_DERIVATION_RULES.has(upper)) return upper
  return formatted
}

function parseRuleList(value, logicSystem = DEFAULT_LOGIC_SYSTEM) {
  const source = Array.isArray(value)
    ? value.flatMap((entry) => String(entry || '').split(/[,\s]+/g))
    : String(value || '').split(/[,\s]+/g)
  const out = []
  const seen = new Set()
  source.forEach((entry) => {
    const normalized = normalizeRuleToken(entry, logicSystem)
    if (!normalized) return
    const key = normalized.toLowerCase()
    if (seen.has(key)) return
    seen.add(key)
    out.push(normalized)
  })
  return out
}

function isKnownDerivationRule(rule, logicSystem = DEFAULT_LOGIC_SYSTEM) {
  const raw = String(rule || '').trim()
  if (!raw) return true
  const ruleLookup = getDerivationRuleLookup(logicSystem)
  const formatted = formatDerivationRuleName(raw)
  return Boolean(ruleLookup.get(raw.toLowerCase()) || ruleLookup.get(formatted.toLowerCase()))
}

function invalidRuleTokens(value, logicSystem = DEFAULT_LOGIC_SYSTEM) {
  const source = Array.isArray(value)
    ? value.flatMap((entry) => String(entry || '').split(/[,\s]+/g))
    : String(value || '').split(/[,\s]+/g)
  const seen = new Set()
  const out = []
  source.forEach((entry) => {
    const token = String(entry || '').trim()
    if (!token || isKnownDerivationRule(token, logicSystem)) return
    const key = token.toLowerCase()
    if (seen.has(key)) return
    seen.add(key)
    out.push(token)
  })
  return out
}

function normalizeRuleListText(value, logicSystem = DEFAULT_LOGIC_SYSTEM) {
  return String(value ?? '')
    .split(/([,\s]+)/g)
    .map((part) => part.trim() ? normalizeRuleToken(part, logicSystem) : part)
    .join('')
}

function getRuleValue(source, keys) {
  const obj = source && typeof source === 'object' ? source : {}
  for (const key of keys) {
    if (obj[key] !== undefined) return obj[key]
  }
  return undefined
}

function removeRuleKeys(source, keys) {
  const out = { ...(source && typeof source === 'object' ? source : {}) }
  keys.forEach((key) => {
    delete out[key]
  })
  return out
}

const ALLOW_RULE_KEYS = ['allow', 'allowed']
const DISALLOW_RULE_KEYS = ['disallow', 'disallowed', 'deny', 'forbid', 'forbidden']
const RULE_AVAILABILITY_MODES = new Set(['all', 'only', 'except'])

function getRuleAvailabilityMode(ruleset, logicSystem = DEFAULT_LOGIC_SYSTEM) {
  if (RULE_AVAILABILITY_MODES.has(ruleset?.availabilityMode)) return ruleset.availabilityMode
  if (parseRuleList(getRuleValue(ruleset, ALLOW_RULE_KEYS), logicSystem).length) return 'only'
  if (parseRuleList(getRuleValue(ruleset, DISALLOW_RULE_KEYS), logicSystem).length) return 'except'
  return 'all'
}

function getAvailableDerivationRules(ruleset, logicSystem = DEFAULT_LOGIC_SYSTEM) {
  const allRules = getDerivationRules(logicSystem)
  const allow = parseRuleList(getRuleValue(ruleset, ALLOW_RULE_KEYS), logicSystem)
  const disallow = parseRuleList(getRuleValue(ruleset, DISALLOW_RULE_KEYS), logicSystem)
  const disallowSet = new Set(disallow.map((rule) => rule.toLowerCase()))
  const source = allow.length ? allow : allRules
  return source.filter((rule) => !disallowSet.has(rule.toLowerCase()))
}

function normalizeDerivationRuleset(ruleset, logicSystem = DEFAULT_LOGIC_SYSTEM) {
  const source = ruleset && typeof ruleset === 'object' ? ruleset : {}
  const mode = getRuleAvailabilityMode(source, logicSystem)
  const allowFromInput = mode === 'only'
    ? parseRuleList(getRuleValue(source, ALLOW_RULE_KEYS), logicSystem)
    : []
  const disallow = mode === 'except'
    ? parseRuleList(getRuleValue(source, DISALLOW_RULE_KEYS), logicSystem)
    : []
  const require = parseRuleList(source.require ?? source.required ?? source.necessary, logicSystem)
  const requireAny = parseRuleList(source.requireAny ?? source.requiredAny, logicSystem)
  const disallowSet = new Set(parseRuleList(getRuleValue(source, DISALLOW_RULE_KEYS), logicSystem).map((rule) => rule.toLowerCase()))
  const allow = mode === 'only'
    ? allowFromInput.filter((rule) => !disallowSet.has(rule.toLowerCase()))
    : []

  const normalized = {}
  if (allow.length) normalized.allow = allow
  if (disallow.length) normalized.disallow = disallow
  if (require.length) normalized.require = require
  if (requireAny.length) normalized.requireAny = requireAny
  return Object.keys(normalized).length ? normalized : null
}

function validateDerivationRuleset(ruleset, logicSystem = DEFAULT_LOGIC_SYSTEM) {
  const source = ruleset && typeof ruleset === 'object' ? ruleset : {}
  const mode = getRuleAvailabilityMode(source, logicSystem)
  const allowRaw = getRuleValue(source, ALLOW_RULE_KEYS)
  const disallowRaw = getRuleValue(source, DISALLOW_RULE_KEYS)
  const requireRaw = source.require ?? source.required ?? source.necessary
  const requireAnyRaw = source.requireAny ?? source.requiredAny
  const invalid = [
    ...invalidRuleTokens(allowRaw, logicSystem),
    ...invalidRuleTokens(disallowRaw, logicSystem),
    ...invalidRuleTokens(requireRaw, logicSystem),
    ...invalidRuleTokens(requireAnyRaw, logicSystem),
  ]
  if (invalid.length) return `Rule does not exist in this logic system: ${invalid[0]}`
  if (mode === 'only' && !parseRuleList(allowRaw, logicSystem).length) {
    return 'Choose at least one available rule, or set rule availability to all rules.'
  }
  if (mode === 'except' && !parseRuleList(disallowRaw, logicSystem).length) {
    return 'Choose at least one rule to exclude, or set rule availability to all rules.'
  }

  const availableSet = new Set(getAvailableDerivationRules(source, logicSystem).map((rule) => rule.toLowerCase()))
  const required = [
    ...parseRuleList(requireRaw, logicSystem),
    ...parseRuleList(requireAnyRaw, logicSystem),
  ]
  const unavailableRequired = required.find((rule) => !availableSet.has(rule.toLowerCase()))
  if (unavailableRequired) return `Required rule is not available to students: ${unavailableRequired}`
  return ''
}

function buildMcSnapshot(proof, edited, existing) {
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
    patch.answerIndex = Number(answerIndex)
  }
  return patch
}

function buildTruthTableSnapshot(proof, edited, existing, logicSystem = DEFAULT_LOGIC_SYSTEM) {
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
    ...(kind === 'formula' && {
      statement: normalizeFormulaInput(edited.statement ?? tt.statement ?? tt.formula ?? '', logicSystem),
    }),
    ...(kind === 'equivalence' && {
      left: normalizeFormulaInput(edited.left ?? tt.left ?? '', logicSystem),
      right: normalizeFormulaInput(edited.right ?? tt.right ?? '', logicSystem),
    }),
    ...(kind === 'argument' && {
      lefts: normalizeFormulaInputs(Array.isArray(edited.lefts) ? edited.lefts : (tt.lefts || []), logicSystem),
      right: normalizeFormulaInput(edited.right ?? tt.right ?? '', logicSystem),
    }),
  }
  const patch = { [typeKey(e)]: 'truth-table', prompt }
  const ttKey = e.truth_table !== undefined ? 'truth_table' : 'truthTable'
  patch[ttKey] = deepMerge(e[ttKey], truthTableData)
  return patch
}

function buildIndirectTruthTableSnapshot(proof, edited, existing, logicSystem = DEFAULT_LOGIC_SYSTEM) {
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

function buildNonClassicalTruthTableSnapshot(proof, edited, existing, logicSystem = DEFAULT_LOGIC_SYSTEM) {
  const nctt = proof.nonclassicalTruthTable || {}
  const e = existing && typeof existing === 'object' ? existing : {}
  const prompt = edited.prompt ?? nctt.prompt ?? proof.description ?? ''
  const normalizedArgument = normalizeArgumentInput(
    (edited.argument && typeof edited.argument === 'object') ? edited.argument : {},
    logicSystem
  )
  const questions = Array.isArray(edited.questions) ? edited.questions : (nctt.questions || nctt.subquestions || [])
  const truthValueToggle = Array.isArray(edited.truthValueToggle)
    ? edited.truthValueToggle
    : (Array.isArray(nctt.truthValueToggle) ? nctt.truthValueToggle : undefined)
  const patch = { [typeKey(e)]: 'nonclassical-truth-table', prompt, argument: normalizedArgument, questions }
  if (edited.partialCredit !== undefined) {
    patch.partialCredit = edited.partialCredit
  }
  if (truthValueToggle) {
    patch.truthValueToggle = truthValueToggle
  }
  if (e.subquestions !== undefined) patch.subquestions = questions
  return patch
}

function buildDerivationSnapshot(proof, edited, existing, logicSystem = DEFAULT_LOGIC_SYSTEM) {
  const e = existing && typeof existing === 'object' ? existing : {}
  const key = typeKey(e)
  const savedType = e[key] === 'derivation-hurley' ? 'derivation-hurley' : 'derivation'
  const activeLogicSystem = savedType === 'derivation-hurley'
    ? 'hurley'
    : normalizeLogicSystem(logicSystem, DEFAULT_LOGIC_SYSTEM)
  const prems = normalizeFormulaInputs(edited.premises ?? proof.premises ?? proof.prems ?? [], activeLogicSystem)
  const conclusion = normalizeFormulaInput(edited.conclusion ?? proof.conclusion ?? proof.conc ?? '', activeLogicSystem)
  const prompt = edited.prompt ?? proof.description ?? ''
  // new derivations stay generic and the course chooses the system
  // old hurley snapshots keep their mark
  const patch = { [key]: savedType, prompt, prems, conc: conclusion }
  const mergedRuleset = normalizeDerivationRuleset(
    edited.ruleset ?? proof.ruleset ?? proof.ruleSet ?? e.ruleset,
    activeLogicSystem
  )
  if (mergedRuleset) {
    patch.ruleset = mergedRuleset
  }
  return patch
}

function buildProofArgumentExtractionSnapshot(proof, edited, existing, logicSystem = DEFAULT_LOGIC_SYSTEM) {
  const snapshot = proof.questionSnapshot || proof.snapshot || {}
  const e = existing && typeof existing === 'object' ? existing : {}
  return {
    [typeKey(e)]: 'proof-argument-extraction',
    prompt: edited.prompt ?? snapshot.prompt ?? proof.description ?? '',
    prems: normalizeFormulaInputs(edited.premises ?? proof.premises ?? snapshot.prems ?? [], logicSystem),
    lines: normalizeFormulaInputs(edited.lines ?? proof.lines ?? snapshot.lines ?? [], logicSystem),
  }
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
  const subquestions = Array.isArray(value.subquestions)
    ? value.subquestions
    : (Array.isArray(mc.subquestions) ? mc.subquestions : [])
  const choices = value.choices ?? mc.choices ?? []
  const prompt = value.prompt ?? mc.prompt ?? proof?.description ?? ''
  const answerIndex = value.answerIndex ?? proof?.answer ?? 0

  const setChoices = (next) => onChange({ ...value, choices: next })
  const setPrompt = (v) => onChange({ ...value, prompt: v })
  const setAnswerIndex = (v) => onChange({ ...value, answerIndex: Number(v) })
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

function TruthTableEditorForm({ proof, value, onChange, logicSystem = DEFAULT_LOGIC_SYSTEM }) {
  const tt = proof?.truthTable || {}
  const kind = value.kind ?? tt.kind ?? 'formula'
  const prompt = value.prompt ?? tt.prompt ?? proof?.description ?? ''
  const statement = value.statement ?? tt.statement ?? tt.formula ?? ''
  const left = value.left ?? tt.left ?? ''
  const right = value.right ?? tt.right ?? ''
  const lefts = Array.isArray(value.lefts) ? value.lefts : (tt.lefts || [''])
  const opts = tt.options || proof?.options || {}
  const partialCredit = value.partialCredit ?? opts.partialCredit ?? opts.partialcredit ?? opts.partial_credit ?? proof?.partialCredit ?? false
  const classificationQuestion = value.classificationQuestion ?? opts.question ?? false

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
          onChange={(e) => update({ statement: displayFormulaInput(e.target.value, logicSystem) })}
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
            onChange={(e) => update({ left: displayFormulaInput(e.target.value, logicSystem) })}
            fullWidth
            variant="outlined"
          />
          <TextField
            label="Right statement"
            value={right}
            onChange={(e) => update({ right: displayFormulaInput(e.target.value, logicSystem) })}
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
    </Stack>
  )
}

function IndirectTruthTableEditorForm({ proof, value, onChange, logicSystem = DEFAULT_LOGIC_SYSTEM }) {
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

function NonClassicalTruthTableEditorForm({ proof, value, onChange, logicSystem = DEFAULT_LOGIC_SYSTEM }) {
  const rawToggle = value.truthValueToggle ?? proof?.nonclassicalTruthTable?.truthValueToggle ?? ['T', 'F', 'N']
  const toggleText = Array.isArray(rawToggle) ? rawToggle.join(',') : String(rawToggle || '')

  const updateToggle = (text) => {
    const next = text
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean)
    onChange({ ...value, truthValueToggle: next })
  }

  return (
    <Stack spacing={2}>
      <TextField
        label="Truth value cycle"
        value={toggleText}
        onChange={(e) => updateToggle(e.target.value)}
        fullWidth
        helperText="Comma-separated values (e.g., T, F, N or T, F, B or T, F, N, B)."
      />
      <IndirectTruthTableEditorForm proof={proof} value={value} onChange={onChange} logicSystem={logicSystem} />
    </Stack>
  )
}

function DerivationEditorForm({ proof, value, onChange, logicSystem = DEFAULT_LOGIC_SYSTEM }) {
  const premises = value.premises ?? proof.premises ?? proof.prems ?? []
  const conclusion = value.conclusion ?? proof.conclusion ?? proof.conc ?? ''
  const prompt = value.prompt ?? proof.description ?? ''
  const rawRuleset = value.ruleset ?? proof.ruleset ?? proof.ruleSet ?? {}
  const ruleset = rawRuleset && typeof rawRuleset === 'object' ? rawRuleset : {}

  const update = (updates) => onChange({ ...value, ...updates })
  const premsList = Array.isArray(premises) ? premises : (premises ? [premises] : [])
  const activeLogicSystem = proof?.type === 'derivation-hurley'
    ? 'hurley'
    : normalizeLogicSystem(logicSystem, DEFAULT_LOGIC_SYSTEM)
  const toRuleText = (entries) => parseRuleList(entries, activeLogicSystem).join(', ')
  const getRulesetFieldText = (fieldValue) =>
    Array.isArray(fieldValue) ? toRuleText(fieldValue) : String(fieldValue ?? '')
  const availabilityMode = getRuleAvailabilityMode(ruleset, activeLogicSystem)
  const availabilityText = availabilityMode === 'only'
    ? getRulesetFieldText(getRuleValue(ruleset, ALLOW_RULE_KEYS))
    : (availabilityMode === 'except' ? getRulesetFieldText(getRuleValue(ruleset, DISALLOW_RULE_KEYS)) : '')
  const availableRules = getAvailableDerivationRules(ruleset, activeLogicSystem)
  const requiredAll = parseRuleList(ruleset.require ?? ruleset.required ?? ruleset.necessary, activeLogicSystem)
  const requiredAny = parseRuleList(ruleset.requireAny ?? ruleset.requiredAny, activeLogicSystem)
  const rulesetMessage = validateDerivationRuleset(ruleset, activeLogicSystem)
  const availabilitySummary = availabilityMode === 'only'
    ? `Students may use only: ${availableRules.length ? availableRules.join(', ') : 'no rules selected'}.`
    : (availabilityMode === 'except'
      ? `Students may use all rules except: ${toRuleText(getRuleValue(ruleset, DISALLOW_RULE_KEYS)) || 'no rules selected'}.`
      : 'Students may use all rules.')
  const requirementSummary = [
    requiredAll.length ? `Must use: ${requiredAll.join(', ')}.` : '',
    requiredAny.length ? `Must use at least one of: ${requiredAny.join(', ')}.` : '',
  ].filter(Boolean).join(' ')
  const setRulesetField = (field, text) => {
    const nextRuleset = {
      ...ruleset,
      [field]: normalizeRuleListText(text, activeLogicSystem),
    }
    update({ ruleset: nextRuleset })
  }
  const setAvailabilityMode = (mode) => {
    const nextRuleset = removeRuleKeys(ruleset, [...ALLOW_RULE_KEYS, ...DISALLOW_RULE_KEYS])
    nextRuleset.availabilityMode = mode
    update({ ruleset: nextRuleset })
  }
  const setAvailabilityRules = (text) => {
    const nextRuleset = removeRuleKeys(ruleset, [...ALLOW_RULE_KEYS, ...DISALLOW_RULE_KEYS])
    nextRuleset.availabilityMode = availabilityMode
    if (availabilityMode === 'only') {
      nextRuleset.allow = normalizeRuleListText(text, activeLogicSystem)
    } else if (availabilityMode === 'except') {
      nextRuleset.disallow = normalizeRuleListText(text, activeLogicSystem)
    }
    update({ ruleset: nextRuleset })
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
      <FormulaListEditor
        label="Premises"
        values={premsList}
        onChange={(next) => update({
          premises: next.map((formula) => displayFormulaInput(formula, activeLogicSystem)),
        })}
        placeholder="Premise"
      />
      <TextField
        label="Conclusion"
        value={conclusion}
        onChange={(e) => update({ conclusion: displayFormulaInput(e.target.value, activeLogicSystem) })}
        fullWidth
        variant="outlined"
      />
      <FormControl component="fieldset">
        <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Rule availability</Typography>
        <RadioGroup value={availabilityMode} onChange={(e) => setAvailabilityMode(e.target.value)}>
          <FormControlLabel value="all" control={<Radio size="small" />} label="All rules are available" />
          <FormControlLabel value="only" control={<Radio size="small" />} label="Only these rules are available" />
          <FormControlLabel value="except" control={<Radio size="small" />} label="All except these rules" />
        </RadioGroup>
      </FormControl>
      {availabilityMode !== 'all' && (
        <TextField
          label={availabilityMode === 'only' ? 'Available rules' : 'Excluded rules'}
          value={availabilityText}
          onChange={(e) => setAvailabilityRules(e.target.value)}
          fullWidth
          variant="outlined"
          placeholder={activeLogicSystem === 'hurley' ? 'e.g. MP, MT, DS, CP, IP' : 'e.g. R, ∧I, ∧E, →E'}
          error={Boolean(rulesetMessage)}
          helperText={rulesetMessage || (availabilityMode === 'only'
            ? 'Only listed rules appear to students and pass validation.'
            : 'Listed rules are hidden from students and rejected by validation.')}
        />
      )}
      <TextField
        label="Required rules (all)"
        value={getRulesetFieldText(ruleset.require)}
        onChange={(e) => setRulesetField('require', e.target.value)}
        fullWidth
        variant="outlined"
        placeholder="e.g. CP, IP"
      />
      <TextField
        label="Required rules (any)"
        value={getRulesetFieldText(ruleset.requireAny)}
        onChange={(e) => setRulesetField('requireAny', e.target.value)}
        fullWidth
        variant="outlined"
        placeholder="e.g. UI, UG, EI, EG"
      />
      <Typography variant="body2" sx={{ color: rulesetMessage ? 'error.main' : 'text.secondary' }}>
        {rulesetMessage || `${availabilitySummary}${requirementSummary ? ` ${requirementSummary}` : ''}`}
      </Typography>
    </Stack>
  )
}

function FormulaListEditor({ label, values, onChange, placeholder, finalLabel }) {
  const list = Array.isArray(values) && values.length ? values : ['']
  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>{label}</Typography>
      {list.map((formula, index) => (
        <Stack key={index} direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
          <TextField
            size="small"
            value={formula}
            onChange={(event) => {
              const next = [...list]
              next[index] = event.target.value
              onChange(next)
            }}
            fullWidth
            label={finalLabel && index === list.length - 1 ? finalLabel : undefined}
            placeholder={`${placeholder} ${index + 1}`}
          />
          <IconButton
            size="small"
            onClick={() => {
              const next = list.filter((_, itemIndex) => itemIndex !== index)
              onChange(next)
            }}
            aria-label={`Remove ${placeholder.toLowerCase()} ${index + 1}`}
          >
            <DeleteOutlineIcon />
          </IconButton>
        </Stack>
      ))}
      <Button size="small" startIcon={<AddIcon />} onClick={() => onChange([...list, ''])}>
        Add {placeholder.toLowerCase()}
      </Button>
    </Box>
  )
}

function ProofArgumentExtractionEditorForm({ proof, value, onChange, logicSystem = DEFAULT_LOGIC_SYSTEM }) {
  const snapshot = proof?.questionSnapshot || proof?.snapshot || {}
  const premises = value.premises ?? proof?.premises ?? snapshot.prems ?? []
  const lines = value.lines ?? proof?.lines ?? snapshot.lines ?? []
  const update = (updates) => onChange({ ...value, ...updates })
  return (
    <Stack spacing={2}>
      <TextField
        label="Prompt"
        multiline
        minRows={2}
        value={value.prompt ?? snapshot.prompt ?? proof?.description ?? ''}
        onChange={(event) => update({ prompt: event.target.value })}
        fullWidth
      />
      <FormulaListEditor
        label="Premises"
        values={premises}
        onChange={(next) => update({
          premises: next.map((formula) => displayFormulaInput(formula, logicSystem)),
        })}
        placeholder="Premise"
      />
      <FormulaListEditor
        label="Lines after the premises"
        values={lines}
        onChange={(next) => update({
          lines: next.map((formula) => displayFormulaInput(formula, logicSystem)),
        })}
        placeholder="Line"
        finalLabel="Conclusion"
      />
      <Typography variant="body2" color="text.secondary">
        The final line is the conclusion
      </Typography>
    </Stack>
  )
}

function buildTrueFalseSnapshot(proof, edited, existing) {
  const tf = proof.trueFalse || {}
  const e = existing && typeof existing === 'object' ? existing : {}
  const prompt = edited.prompt ?? tf.prompt ?? proof.description ?? ''
  const answer = edited.answer !== undefined ? edited.answer : (proof.answer ?? false)
  return { [typeKey(e)]: 'true-false', prompt, answer: Boolean(answer) }
}

function buildEvaluateTruthSnapshot(proof, edited, existing, logicSystem = DEFAULT_LOGIC_SYSTEM) {
  const e = existing && typeof existing === 'object' ? existing : {}
  const statement = normalizeFormulaInput(edited.statement ?? proof.evaluateTruth ?? proof.description ?? '', logicSystem)
  const answer = edited.answer !== undefined ? edited.answer : (proof.answer ?? false)
  return { [typeKey(e)]: 'evaluate-truth', prompt: statement, statement, answer: Boolean(answer) }
}

function buildSymbolicTranslationSnapshot(proof, edited, existing, logicSystem = DEFAULT_LOGIC_SYSTEM) {
  const tr = proof.translation || {}
  const e = existing && typeof existing === 'object' ? existing : {}
  const prompt = edited.prompt ?? tr.prompt ?? proof.description ?? ''
  const rawKey = Array.isArray(edited.symbolizationKey) ? edited.symbolizationKey : (tr.symbolizationKey || [])
  const symbolizationKey = rawKey.filter((x) => x != null && String(x).trim() !== '')
  const answer = normalizeFormulaInput(edited.answer ?? proof.answer ?? tr.answer ?? '', logicSystem)
  const patch = { [typeKey(e)]: 'symbolic-translation', prompt, symbolizationKey, answer }
  if (e.legend !== undefined) patch.legend = edited.legend ?? tr.legend ?? proof.legend ?? ''
  return patch
}

function buildSingleRowTruthTableSnapshot(proof, edited, existing, logicSystem = DEFAULT_LOGIC_SYSTEM) {
  const sr = proof.singleRowTruthTable || {}
  const statement = normalizeFormulaInput(edited.statement ?? sr.statement ?? sr.formula ?? proof.description ?? '', logicSystem)
  const prompt = edited.prompt ?? sr.prompt ?? proof.description ?? ''
  const editedInterp = edited.interpretation ?? sr.interpretation ?? {}
  const hasEditedInterp = editedInterp && typeof editedInterp === 'object' && Object.keys(editedInterp).length > 0
  const interp = hasEditedInterp ? editedInterp : (existing?.interpretation && typeof existing.interpretation === 'object' ? existing.interpretation : {})
  return {
    [typeKey(existing)]: 'single-row-truth-table',
    prompt,
    statement,
    interpretation: interp,
  }
}

function buildPartialTruthTableSnapshot(proof, edited, existing, logicSystem = DEFAULT_LOGIC_SYSTEM) {
  const pt = proof.partialTruthTable || {}
  const e = existing && typeof existing === 'object' ? existing : {}
  const statement = normalizeFormulaInput(edited.statement ?? pt.statement ?? pt.formula ?? '', logicSystem)
  const prompt = edited.prompt ?? pt.prompt ?? proof.description ?? ''
  const row = Array.isArray(edited.row) ? edited.row : (pt.row || [])
  return { [typeKey(e)]: 'partial-truth-table', prompt, statement, row }
}

function buildComboSnapshot(proof, edited, existing, comboTypeKey, logicSystem = DEFAULT_LOGIC_SYSTEM) {
  const snapshot = proof[comboTypeKey] || proof.snapshot || {}
  const e = existing && typeof existing === 'object' ? existing : {}
  const prompt = edited.prompt ?? snapshot.prompt ?? proof.description ?? ''
  const typeVal = comboTypeKey === 'comboTranslationTruthTable' ? 'combo-translation-truth-table' : 'combo-translation-derivation'
  const patch = { [typeKey(e)]: typeVal, prompt }
  if (comboTypeKey === 'comboTranslationTruthTable') {
    const raw = edited.argumentLine ?? edited.answer
    const answer =
      raw != null && raw !== ''
        ? typeof raw === 'string'
          ? { argument: normalizeFormulaInput(raw, logicSystem) }
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

function EvaluateTruthEditorForm({ proof, value, onChange, logicSystem = DEFAULT_LOGIC_SYSTEM }) {
  const statement = value.statement ?? proof?.evaluateTruth ?? proof?.description ?? ''
  const answer = value.answer ?? proof?.answer ?? false
  const symbols = getSymbols(logicSystem)
  return (
    <Stack spacing={2}>
      <TextField label="Statement" multiline minRows={1} value={statement} onChange={(e) => onChange({ ...value, statement: displayFormulaInput(e.target.value, logicSystem) })} fullWidth variant="outlined" placeholder={`e.g. P ${symbols.and} Q`} />
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

function SymbolicTranslationEditorForm({ proof, value, onChange, logicSystem = DEFAULT_LOGIC_SYSTEM }) {
  const tr = proof?.translation || {}
  const symbols = getSymbols(logicSystem)
  const prompt = value.prompt ?? tr.prompt ?? proof?.description ?? ''
  const legend = value.legend ?? tr.legend ?? proof?.legend ?? ''
  const symbolizationKey = Array.isArray(value.symbolizationKey) ? value.symbolizationKey : (tr.symbolizationKey || [])
  const answer = value.answer ?? proof?.answer ?? tr?.answer ?? proof?.solution ?? ''
  const keyList = Array.isArray(symbolizationKey) && symbolizationKey.length > 0 ? symbolizationKey : ['']
  const updateKey = (idx, str) => {
    const next = [...keyList]
    next[idx] = displayIndexedSymbolsForNotation(str, getNotation(logicSystem))
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
      <TextField label="Correct answer" value={answer} onChange={(e) => onChange({ ...value, answer: displayFormulaInput(e.target.value, logicSystem) })} fullWidth variant="outlined" placeholder={`e.g. P ${symbols.and} Q`} />
    </Stack>
  )
}

function SingleRowTruthTableEditorForm({ proof, value, onChange, logicSystem = DEFAULT_LOGIC_SYSTEM }) {
  const sr = proof?.singleRowTruthTable || {}
  const statement = value.statement ?? sr.statement ?? proof?.description ?? ''
  const prompt = value.prompt ?? sr.prompt ?? proof?.description ?? ''
  return (
    <Stack spacing={2}>
      <TextField label="Statement" value={statement} onChange={(e) => onChange({ ...value, statement: displayFormulaInput(e.target.value, logicSystem) })} fullWidth variant="outlined" />
      <TextField label="Prompt" multiline minRows={1} value={prompt} onChange={(e) => onChange({ ...value, prompt: e.target.value })} fullWidth variant="outlined" />
    </Stack>
  )
}

function PartialTruthTableEditorForm({ proof, value, onChange, logicSystem = DEFAULT_LOGIC_SYSTEM }) {
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
      <TextField label="Statement" value={statement} onChange={(e) => onChange({ ...value, statement: displayFormulaInput(e.target.value, logicSystem) })} fullWidth variant="outlined" />
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

function ComboTruthTableEditorForm({ proof, value, onChange, logicSystem = DEFAULT_LOGIC_SYSTEM }) {
  const snapshot = proof?.comboTranslationTruthTable || proof?.snapshot || {}
  const symbols = getSymbols(logicSystem)
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
        onChange={(e) => onChange({ ...value, argumentLine: displayFormulaInput(e.target.value, logicSystem) })}
        fullWidth
        variant="outlined"
        placeholder={`P ${symbols.conditional} Q / P // Q`}
      />
    </Stack>
  )
}

const SUPPORTED_TYPES = new Set([
  'multiple-choice',
  'truth-table',
  'indirect-truth-table',
  'nonclassical-truth-table',
  'derivation',
  'derivation-hurley',
  'derivation-calgary',
  'true-false',
  'evaluate-truth',
  'symbolic-translation',
  'single-row-truth-table',
  'partial-truth-table',
  'combo-translation-truth-table',
  'combo-translation-derivation',
  'proof-argument-extraction',
])

function InstructorQuestionEditorInner({
  proof,
  isInstructorView,
  onSaved,
  onCreated,
  assignmentId,
  orderIndex,
  mode = 'edit',
  trigger = 'button',
  forwardedRef,
  logicSystem,
}) {
  const [open, setOpen] = React.useState(false)
  const [editValue, setEditValue] = React.useState({})
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState('')
  const initialEditValueRef = React.useRef(null)

  const questionId = proof?.questionId
  const supported = proof?.type && SUPPORTED_TYPES.has(proof.type)
  const isCreate = mode === 'create'
  const activeLogicSystem = proof?.type === 'derivation-hurley'
    ? 'hurley'
    : normalizeLogicSystem(logicSystem ?? proof?.logicSystem, DEFAULT_LOGIC_SYSTEM)

  const handleOpen = React.useCallback(() => {
    const base = { attemptLimit: proof?.attemptLimit ?? 3 }
    if (proof?.type === 'multiple-choice') {
      const mc = proof.multipleChoice || {}
      base.prompt = mc.prompt ?? proof.description ?? ''
      base.choices = Array.isArray(mc.choices) ? [...mc.choices] : []
      base.answerIndex = proof.answer ?? 0
      if (Array.isArray(mc.subquestions) && mc.subquestions.length > 0) {
        base.subquestions = mc.subquestions.map((subq) => ({
          ...(subq && typeof subq === 'object' ? subq : {}),
          prompt: subq?.prompt ?? '',
          choices: Array.isArray(subq?.choices) ? [...subq.choices] : [],
          answerIndex: Number(subq?.answerIndex ?? subq?.answer ?? 0),
        }))
      }
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
      const rawOpts = proof?.questionSnapshot?.truthTable?.options ?? proof?.questionSnapshot?.truth_table?.options
      const opts = rawOpts ?? tt.options ?? proof.options ?? {}
      base.prompt = tt.prompt ?? proof.description ?? ''
      base.kind = tt.kind ?? 'formula'
      base.statement = tt.statement ?? tt.formula ?? ''
      base.left = tt.left ?? ''
      base.right = tt.right ?? ''
      base.lefts = Array.isArray(tt.lefts) ? [...tt.lefts] : []
      base.partialCredit = opts.partialCredit ?? opts.partialcredit ?? opts.partial_credit ?? Boolean(proof.partialCredit)
      base.classificationQuestion = opts.question ?? false
    }
    if (proof?.type === 'indirect-truth-table') {
      const itt = proof.indirectTruthTable || {}
      base.prompt = itt.prompt ?? proof.description ?? ''
      base.argument = itt.argument ? { ...itt.argument } : {}
      base.questions = Array.isArray(itt.questions) ? itt.questions.map((q) => ({ ...q })) : (Array.isArray(itt.subquestions) ? itt.subquestions.map((q) => ({ ...q })) : [])
      base.partialCredit = Boolean(proof.partialCredit)
    }
    if (proof?.type === 'nonclassical-truth-table') {
      const nctt = proof.nonclassicalTruthTable || {}
      base.prompt = nctt.prompt ?? proof.description ?? ''
      base.argument = nctt.argument ? { ...nctt.argument } : {}
      base.questions = Array.isArray(nctt.questions) ? nctt.questions.map((q) => ({ ...q })) : (Array.isArray(nctt.subquestions) ? nctt.subquestions.map((q) => ({ ...q })) : [])
      base.truthValueToggle = Array.isArray(nctt.truthValueToggle) ? [...nctt.truthValueToggle] : ['T', 'F', 'N']
      base.partialCredit = Boolean(proof.partialCredit)
    }
    if (isDerivationProblemType(proof?.type)) {
      base.prompt = proof.description ?? ''
      base.premises = Array.isArray(proof.premises) ? [...proof.premises] : (Array.isArray(proof.prems) ? [...proof.prems] : [])
      base.conclusion = proof.conclusion ?? proof.conc ?? ''
      base.ruleset = {
        ...(proof.ruleset && typeof proof.ruleset === 'object' ? proof.ruleset : {}),
      }
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
    if (proof?.type === 'proof-argument-extraction') {
      const snap = proof.questionSnapshot || proof.snapshot || {}
      base.prompt = snap.prompt ?? proof.description ?? ''
      base.premises = Array.isArray(proof.premises) ? [...proof.premises] : [...(snap.prems || [])]
      base.lines = Array.isArray(proof.lines) ? [...proof.lines] : [...(snap.lines || [])]
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
    proof?.lines,
    proof?.snapshot,
  ])

  React.useImperativeHandle(forwardedRef, () => ({
    open: handleOpen,
  }), [handleOpen])

  const handleSave = async () => {
    if (!isCreate && !questionId) return
    setSaving(true)
    setError('')
    try {
      const existingSnapshot = proof?.questionSnapshot ?? {}
      const existing = typeof existingSnapshot === 'object' && existingSnapshot !== null ? existingSnapshot : {}
      let question_snapshot
      if (proof.type === 'multiple-choice') {
        question_snapshot = buildMcSnapshot(proof, editValue, existing)
      } else if (proof.type === 'truth-table') {
        question_snapshot = buildTruthTableSnapshot(proof, editValue, existing, activeLogicSystem)
      } else if (proof.type === 'indirect-truth-table') {
        question_snapshot = buildIndirectTruthTableSnapshot(proof, editValue, existing, activeLogicSystem)
      } else if (proof.type === 'nonclassical-truth-table') {
        question_snapshot = buildNonClassicalTruthTableSnapshot(proof, editValue, existing, activeLogicSystem)
      } else if (isDerivationProblemType(proof.type)) {
        question_snapshot = buildDerivationSnapshot(proof, editValue, existing, activeLogicSystem)
      } else if (proof.type === 'true-false') {
        question_snapshot = buildTrueFalseSnapshot(proof, editValue, existing)
      } else if (proof.type === 'evaluate-truth') {
        question_snapshot = buildEvaluateTruthSnapshot(proof, editValue, existing, activeLogicSystem)
      } else if (proof.type === 'symbolic-translation') {
        question_snapshot = buildSymbolicTranslationSnapshot(proof, editValue, existing, activeLogicSystem)
      } else if (proof.type === 'single-row-truth-table') {
        question_snapshot = buildSingleRowTruthTableSnapshot(proof, editValue, existing, activeLogicSystem)
      } else if (proof.type === 'partial-truth-table') {
        question_snapshot = buildPartialTruthTableSnapshot(proof, editValue, existing, activeLogicSystem)
      } else if (proof.type === 'combo-translation-truth-table') {
        question_snapshot = buildComboSnapshot(proof, editValue, existing, 'comboTranslationTruthTable', activeLogicSystem)
      } else if (proof.type === 'combo-translation-derivation') {
        question_snapshot = buildComboSnapshot(proof, editValue, existing, 'comboTranslationDerivation', activeLogicSystem)
      } else if (proof.type === 'proof-argument-extraction') {
        question_snapshot = buildProofArgumentExtractionSnapshot(proof, editValue, existing, activeLogicSystem)
      } else {
        setSaving(false)
        return
      }
      let mergedSnapshot = deepMerge(existing, question_snapshot)
      if (proof.type === 'single-row-truth-table') {
        delete mergedSnapshot.singleRowTruthTable
      }
      if (isDerivationProblemType(proof.type)) {
        const rulesetLogicSystem = proof.type === 'derivation-hurley' ? 'hurley' : activeLogicSystem
        const rulesetError = validateDerivationRuleset(editValue.ruleset ?? question_snapshot.ruleset, rulesetLogicSystem)
        if (rulesetError) {
          setError(rulesetError)
          setSaving(false)
          return
        }
      }
      if (proof.type === 'proof-argument-extraction') {
        const premises = Array.isArray(mergedSnapshot.prems) ? mergedSnapshot.prems : []
        const lines = Array.isArray(mergedSnapshot.lines) ? mergedSnapshot.lines : []
        if (premises.length === 0 || premises.some((formula) => !String(formula || '').trim())) {
          setError('Add at least one complete premise')
          setSaving(false)
          return
        }
        if (lines.length === 0 || lines.some((formula) => !String(formula || '').trim())) {
          setError('Add at least one complete proof line')
          setSaving(false)
          return
        }
      }
      const formulaError = validateQuestionSnapshotFormulas(mergedSnapshot, activeLogicSystem)
      if (formulaError) {
        setError(`Invalid formula: ${formulaError}`)
        setSaving(false)
        return
      }
      const attemptLimit = editValue.attemptLimit

      if (isCreate) {
        if (!assignmentId) {
          setError('Assignment id required')
          setSaving(false)
          return
        }
        const payload = {
          assignment_id: assignmentId,
          order_index: Number.isFinite(Number(orderIndex)) ? Number(orderIndex) : 0,
          points_value: 100,
          attempt_limit: Number.isFinite(Number(attemptLimit)) ? Number(attemptLimit) : 3,
          question_snapshot: mergedSnapshot,
        }
        const created = await fetchJson('/api/assignment-questions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        setOpen(false)
        onCreated?.(created)
        return
      }

      const omitAttemptLimit = (v) => {
        const { attemptLimit: _, ...rest } = v || {}
        return rest
      }
      const formChanged =
        initialEditValueRef.current != null &&
        JSON.stringify(omitAttemptLimit(editValue)) !== JSON.stringify(omitAttemptLimit(initialEditValueRef.current))
      const body = {}
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
        <DialogTitle>{isCreate ? 'Create question' : 'Edit question'}</DialogTitle>
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
              <TruthTableEditorForm proof={proof} value={editValue} onChange={setEditValue} logicSystem={activeLogicSystem} />
            )}
            {proof.type === 'indirect-truth-table' && (
              <IndirectTruthTableEditorForm proof={proof} value={editValue} onChange={setEditValue} logicSystem={activeLogicSystem} />
            )}
            {proof.type === 'nonclassical-truth-table' && (
              <NonClassicalTruthTableEditorForm proof={proof} value={editValue} onChange={setEditValue} logicSystem={activeLogicSystem} />
            )}
            {isDerivationProblemType(proof.type) && (
              <DerivationEditorForm proof={proof} value={editValue} onChange={setEditValue} logicSystem={activeLogicSystem} />
            )}
            {proof.type === 'true-false' && (
              <TrueFalseEditorForm proof={proof} value={editValue} onChange={setEditValue} />
            )}
            {proof.type === 'evaluate-truth' && (
              <EvaluateTruthEditorForm proof={proof} value={editValue} onChange={setEditValue} logicSystem={activeLogicSystem} />
            )}
            {proof.type === 'symbolic-translation' && (
              <SymbolicTranslationEditorForm proof={proof} value={editValue} onChange={setEditValue} logicSystem={activeLogicSystem} />
            )}
            {proof.type === 'single-row-truth-table' && (
              <SingleRowTruthTableEditorForm proof={proof} value={editValue} onChange={setEditValue} logicSystem={activeLogicSystem} />
            )}
            {proof.type === 'partial-truth-table' && (
              <PartialTruthTableEditorForm proof={proof} value={editValue} onChange={setEditValue} logicSystem={activeLogicSystem} />
            )}
            {proof.type === 'combo-translation-truth-table' && (
              <ComboTruthTableEditorForm proof={proof} value={editValue} onChange={setEditValue} logicSystem={activeLogicSystem} />
            )}
            {proof.type === 'combo-translation-derivation' && (
              <ComboPromptEditorForm proof={proof} value={editValue} onChange={setEditValue} label="Prompt" />
            )}
            {proof.type === 'proof-argument-extraction' && (
              <ProofArgumentExtractionEditorForm proof={proof} value={editValue} onChange={setEditValue} logicSystem={activeLogicSystem} />
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : isCreate ? 'Create' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

const InstructorQuestionEditor = React.forwardRef(function InstructorQuestionEditor(
  { proof, isInstructorView, onSaved, onCreated, assignmentId, orderIndex, mode = 'edit', trigger = 'button', logicSystem },
  ref
) {
  return (
    <InstructorQuestionEditorInner
      proof={proof}
      isInstructorView={isInstructorView}
      onSaved={onSaved}
      onCreated={onCreated}
      assignmentId={assignmentId}
      orderIndex={orderIndex}
      mode={mode}
      trigger={trigger}
      logicSystem={logicSystem}
      forwardedRef={ref}
    />
  )
})

export default InstructorQuestionEditor

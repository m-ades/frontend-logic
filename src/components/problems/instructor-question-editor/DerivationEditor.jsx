import * as React from 'react'
import {
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { DEFAULT_LOGIC_SYSTEM, normalizeLogicSystem } from '../../../lib/logicSystems.js'
import { displayFormulaInput, normalizeFormulaInput, normalizeFormulaInputs } from './formulaHelpers.js'
import { FormulaListEditor } from './FormulaListEditor.jsx'
import { typeKey } from './snapshotUtils.js'
import {
  ALLOW_RULE_KEYS,
  DISALLOW_RULE_KEYS,
  getAvailableDerivationRules,
  getRuleAvailabilityMode,
  getRuleValue,
  normalizeDerivationRuleset,
  normalizeRuleListText,
  parseRuleList,
  removeRuleKeys,
  validateDerivationRuleset,
} from './ruleHelpers.js'

export function buildDerivationSnapshot(proof, edited, existing, logicSystem = DEFAULT_LOGIC_SYSTEM) {
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

export function DerivationEditorForm({ proof, value, onChange, logicSystem = DEFAULT_LOGIC_SYSTEM }) {
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

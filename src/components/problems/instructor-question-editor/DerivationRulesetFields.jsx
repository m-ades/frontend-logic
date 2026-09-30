import * as React from 'react'
import {
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  TextField,
  Typography,
} from '@mui/material'
import {
  ALLOW_RULE_KEYS,
  DISALLOW_RULE_KEYS,
  REQUIRE_ALL_KEYS,
  REQUIRE_ANY_KEYS,
  getAvailableDerivationRules,
  getRuleAvailabilityMode,
  getRuleValue,
  normalizeRuleListText,
  parseRuleList,
  removeRuleKeys,
  validateDerivationRuleset,
} from './ruleHelpers.js'

// rule availability and requirement fields shared by every editor whose answers are derivations
export function DerivationRulesetFields({ ruleset: rawRuleset, logicSystem, onChange }) {
  const ruleset = rawRuleset && typeof rawRuleset === 'object' ? rawRuleset : {}
  const toRuleText = (entries) => parseRuleList(entries, logicSystem).join(', ')
  const getRulesetFieldText = (fieldValue) =>
    Array.isArray(fieldValue) ? toRuleText(fieldValue) : String(fieldValue ?? '')
  const availabilityMode = getRuleAvailabilityMode(ruleset, logicSystem)
  const availabilityText = availabilityMode === 'only'
    ? getRulesetFieldText(getRuleValue(ruleset, ALLOW_RULE_KEYS))
    : (availabilityMode === 'except' ? getRulesetFieldText(getRuleValue(ruleset, DISALLOW_RULE_KEYS)) : '')
  const availableRules = getAvailableDerivationRules(ruleset, logicSystem)
  const requiredAll = parseRuleList(getRuleValue(ruleset, REQUIRE_ALL_KEYS), logicSystem)
  const requiredAny = parseRuleList(getRuleValue(ruleset, REQUIRE_ANY_KEYS), logicSystem)
  // one requirement list reads as all or any and only older questions holding both get two fields
  const hasBothRequirements = requiredAll.length > 0 && requiredAny.length > 0
  const requireMode = ['all', 'any'].includes(ruleset.requireMode)
    ? ruleset.requireMode
    : (requiredAny.length && !requiredAll.length ? 'any' : 'all')
  const requireKeys = requireMode === 'any' ? REQUIRE_ANY_KEYS : REQUIRE_ALL_KEYS
  const requiredText = getRulesetFieldText(getRuleValue(ruleset, requireKeys))
  const rulesetMessage = validateDerivationRuleset(ruleset, logicSystem)
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
    onChange({
      ...ruleset,
      [field]: normalizeRuleListText(text, logicSystem),
    })
  }
  const setRequirement = (mode, text) => {
    const nextRuleset = removeRuleKeys(ruleset, [...REQUIRE_ALL_KEYS, ...REQUIRE_ANY_KEYS])
    nextRuleset.requireMode = mode
    nextRuleset[mode === 'any' ? 'requireAny' : 'require'] = normalizeRuleListText(text, logicSystem)
    onChange(nextRuleset)
  }
  const setAvailabilityMode = (mode) => {
    const nextRuleset = removeRuleKeys(ruleset, [...ALLOW_RULE_KEYS, ...DISALLOW_RULE_KEYS])
    nextRuleset.availabilityMode = mode
    onChange(nextRuleset)
  }
  const setAvailabilityRules = (text) => {
    const nextRuleset = removeRuleKeys(ruleset, [...ALLOW_RULE_KEYS, ...DISALLOW_RULE_KEYS])
    nextRuleset.availabilityMode = availabilityMode
    if (availabilityMode === 'only') {
      nextRuleset.allow = normalizeRuleListText(text, logicSystem)
    } else if (availabilityMode === 'except') {
      nextRuleset.disallow = normalizeRuleListText(text, logicSystem)
    }
    onChange(nextRuleset)
  }

  return (
    <>
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
          placeholder={logicSystem === 'hurley' ? 'e.g. MP, MT, DS, CP, IP' : 'e.g. R, ∧I, ∧E, →E'}
          error={Boolean(rulesetMessage)}
          helperText={rulesetMessage || (availabilityMode === 'only'
            ? 'Only listed rules appear to students and pass validation.'
            : 'Listed rules are hidden from students and rejected by validation.')}
        />
      )}
      {hasBothRequirements ? (
        <>
          <TextField
            label="Must use all of"
            value={getRulesetFieldText(getRuleValue(ruleset, REQUIRE_ALL_KEYS))}
            onChange={(e) => setRulesetField('require', e.target.value)}
            fullWidth
            variant="outlined"
          />
          <TextField
            label="Must use at least one of"
            value={getRulesetFieldText(getRuleValue(ruleset, REQUIRE_ANY_KEYS))}
            onChange={(e) => setRulesetField('requireAny', e.target.value)}
            fullWidth
            variant="outlined"
          />
        </>
      ) : (
        <FormControl component="fieldset">
          <TextField
            label="Required rules"
            value={requiredText}
            onChange={(e) => setRequirement(requireMode, e.target.value)}
            fullWidth
            variant="outlined"
            placeholder="e.g. CP, IP"
          />
          {requiredText.trim() && (
            <RadioGroup row value={requireMode} onChange={(e) => setRequirement(e.target.value, requiredText)} sx={{ alignItems: 'center', mt: 0.5 }}>
              <Typography variant="body2" sx={{ color: 'text.secondary', mr: 1.5 }}>Students must use</Typography>
              <FormControlLabel value="all" control={<Radio size="small" />} label="all of these" />
              <FormControlLabel value="any" control={<Radio size="small" />} label="at least one of these" />
            </RadioGroup>
          )}
        </FormControl>
      )}
      <Typography variant="body2" sx={{ color: rulesetMessage ? 'error.main' : 'text.secondary' }}>
        {rulesetMessage || `${availabilitySummary}${requirementSummary ? ` ${requirementSummary}` : ''}`}
      </Typography>
    </>
  )
}

// renders the established classification prompt and choice layout
// consistency choices remain mutually exclusive within multiple selection
// onchange receives the complete normalized selection array

import {
  Checkbox,
  FormControl,
  FormControlLabel,
  FormLabel,
  FormGroup,
  Radio,
  RadioGroup,
} from '@mui/material'

const CONSISTENCY_VALUES = new Set(['consistent', 'inconsistent'])

export default function TruthTableClassification({
  classification,
  selection,
  onChange,
}) {
  const options = classification.options ?? []

  if (classification.selectionMode === 'single') {
    return (
      <FormControl component="fieldset" variant="standard" sx={{ width: 'auto', maxWidth: '40rem' }}>
        <FormLabel component="legend">{classification.prompt}</FormLabel>
        <RadioGroup
          value={selection[0] || ''}
          onChange={(event) => onChange(event.target.value ? [event.target.value] : [])}
        >
          {options.map((option) => (
            <FormControlLabel
              key={option.value}
              value={option.value}
              control={<Radio />}
              label={option.label}
            />
          ))}
        </RadioGroup>
      </FormControl>
    )
  }

  const updateOption = (value, checked) => {
    const withoutValue = selection.filter((entry) => entry !== value)
    if (!checked) {
      onChange(withoutValue)
      return
    }
    const next = CONSISTENCY_VALUES.has(value)
      ? withoutValue.filter((entry) => !CONSISTENCY_VALUES.has(entry))
      : withoutValue
    onChange([...next, value])
  }

  return (
    <FormControl component="fieldset" variant="standard" sx={{ width: 'auto', maxWidth: '40rem' }}>
      <FormLabel component="legend">{classification.prompt}</FormLabel>
      <FormGroup>
        {options.map((option) => (
          <FormControlLabel
            key={option.value}
            control={(
              <Checkbox
                checked={selection.includes(option.value)}
                onChange={(event) => updateOption(option.value, event.target.checked)}
              />
            )}
            label={option.label}
          />
        ))}
      </FormGroup>
    </FormControl>
  )
}

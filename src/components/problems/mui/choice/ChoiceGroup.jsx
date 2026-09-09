import { Box, Checkbox, FormControl, FormControlLabel, FormGroup, Radio, RadioGroup } from '@mui/material'
import { choiceLabelWithGapSx } from '../frame/ProblemFrame.jsx'
import PromptText from '../../../ui/PromptText.jsx'
import { getSubquestionChoices, isMultiSelectSubquestion } from '../../../../lib/logicpenguin/multiple-choice-utils.js'

const multiSelectLabelSx = { ...choiceLabelWithGapSx, ml: 2 }
const singleSelectLabelSx = choiceLabelWithGapSx

export function ChoiceGroup({
  choices,
  isMultiSelect,
  selectedValue,
  name,
  disabled,
  onSingleChange,
  onMultiChange,
}) {
  if (isMultiSelect) {
    return (
      <FormGroup>
        {choices.map((choice, index) => (
          <FormControlLabel
            key={`${name}-${index}`}
            control={(
              <Checkbox
                checked={Array.isArray(selectedValue) && selectedValue.includes(index)}
                onChange={onMultiChange ? (event) => onMultiChange(index, event.target.checked) : undefined}
                disabled={disabled}
              />
            )}
            label={choice}
            sx={multiSelectLabelSx}
          />
        ))}
      </FormGroup>
    )
  }

  const radioValue = selectedValue === '' || selectedValue === null || selectedValue === undefined
    ? ''
    : String(selectedValue)

  return (
    <RadioGroup
      value={radioValue}
      onChange={onSingleChange ? (event) => onSingleChange(event.target.value) : undefined}
      name={name}
    >
      {choices.map((choice, index) => (
        <FormControlLabel
          key={`${name}-${index}`}
          value={String(index)}
          control={<Radio disabled={disabled} />}
          label={choice}
          sx={singleSelectLabelSx}
        />
      ))}
    </RadioGroup>
  )
}

export function FieldsetChoiceGroup(props) {
  return (
    <FormControl component="fieldset" sx={{ width: '100%' }}>
      <ChoiceGroup {...props} />
    </FormControl>
  )
}

export function SubquestionChoiceList({
  questions,
  selectedValues,
  namePrefix,
  disabled = false,
  onSingleChange,
  onMultiChange,
  promptSx = { mb: 1, fontWeight: 500 },
}) {
  return (
    <Box sx={{ display: 'grid', gap: 3 }}>
      {questions.map((subq, idx) => (
        <Box key={`${namePrefix}-${idx}`}>
          <PromptText content={subq?.prompt} sx={promptSx} />
          <FieldsetChoiceGroup
            choices={getSubquestionChoices(subq)}
            isMultiSelect={isMultiSelectSubquestion(subq)}
            selectedValue={selectedValues?.[idx]}
            name={`${namePrefix}-${idx}`}
            disabled={disabled}
            onSingleChange={onSingleChange ? (value) => onSingleChange(idx, value) : undefined}
            onMultiChange={onMultiChange ? (choiceIndex, checked) => onMultiChange(idx, choiceIndex, checked) : undefined}
          />
        </Box>
      ))}
    </Box>
  )
}

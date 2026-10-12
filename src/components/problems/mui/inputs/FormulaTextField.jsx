import { forwardRef, useCallback } from 'react'
import { TextField } from '@mui/material'
import FormulaInput from '../../../ui/logic-engine/formula-input.js'
import { getNotation } from '../../../../lib/logicSystems.js'

// a text field with the typed formula shortcuts every formula input shares
const FormulaTextField = forwardRef(function FormulaTextField({
  value,
  onValueChange,
  onKeyDown,
  logicSystem,
  allowTherefore = false,
  readOnly = false,
  InputProps,
  inputProps,
  ...textFieldProps
}, ref) {
  const notation = getNotation(logicSystem)
  const registerInput = useCallback((input) => {
    if (input) FormulaInput.attach(input, notation, { allowTherefore })
    if (typeof ref === 'function') ref(input)
    else if (ref) ref.current = input
  }, [allowTherefore, notation, ref])

  return (
    <TextField
      {...textFieldProps}
      value={value}
      onChange={(event) => {
        // shows indexed symbols as subscripts while typing
        FormulaInput.input.call(event.target)
        onValueChange?.(event.target.value)
      }}
      onKeyDown={(event) => {
        onKeyDown?.(event)
        if (readOnly || event.defaultPrevented) return
        FormulaInput.keydown.call(event.target, event)
        // a handled shortcut edits the field without an input event so sync it here
        if (event.target.value !== value) onValueChange?.(event.target.value)
      }}
      inputRef={registerInput}
      InputProps={{ ...InputProps, readOnly }}
      inputProps={{ autoComplete: 'off', spellCheck: false, ...inputProps }}
    />
  )
})

export default FormulaTextField

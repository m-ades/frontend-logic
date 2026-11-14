import { forwardRef, useCallback, useRef, useState } from 'react'
import { TextField } from '@mui/material'
import FormulaCodeInput from '../../../ui/logic-engine/FormulaCodeInput.jsx'
import PhoneFormulaKeyboard from '../../../ui/LogicKeyboard/PhoneFormulaKeyboard.jsx'
import useIsPhone from '../../../../hooks/useIsPhone.js'
import useMobileLogicKeyboardEnabled from '../../../../hooks/useMobileLogicKeyboardEnabled.js'
import { getNotation } from '../../../../lib/logicSystems.js'

/*
the formula field every problem, proof line and question editor uses
its ref gets the editor's input like handle for symbol buttons and focus code
on a phone with the logic keypad turned on the phone keyboard stays closed and the keypad types instead
*/
const FormulaField = forwardRef(function FormulaField({
  value,
  onValueChange,
  onFocus,
  onBlur,
  onEnterKey,
  onFormulaKeyDown,
  readOnly = false,
  allowTherefore = false,
  logicSystem,
  symbolizationKey,
  includeQuantifiers = true,
  extraInsertButtons,
  predicateLetters,
  constantLetters,
  variableLetters,
  placeholder = '',
  'aria-label': ariaLabel,
  fullWidth = true,
  sx,
  InputProps,
  inputProps,
  ...textFieldProps
}, ref) {
  const isPhone = useIsPhone()
  const keypadEnabled = useMobileLogicKeyboardEnabled()
  const mobile = isPhone && keypadEnabled && !readOnly
  const fieldRef = useRef(null)
  const anchorRef = useRef(null)
  const [focused, setFocused] = useState(false)

  const registerField = useCallback((handle) => {
    fieldRef.current = handle
    if (typeof ref === 'function') ref(handle)
    else if (ref) ref.current = handle
  }, [ref])

  return (
    <>
      <TextField
        {...textFieldProps}
        ref={anchorRef}
        fullWidth={fullWidth}
        value={value ?? ''}
        onChange={(event) => onValueChange?.(event.target.value)}
        onFocus={(event) => {
          // only the phone keypad reads focus, so desktop skips the rerender
          if (mobile) setFocused(true)
          onFocus?.(event)
        }}
        onBlur={(event) => {
          // a no op on desktop, and clears focus left over if the phone layout switched mid edit
          setFocused(false)
          onBlur?.(event)
        }}
        placeholder={placeholder}
        inputRef={registerField}
        InputProps={{ ...InputProps, readOnly, inputComponent: FormulaCodeInput }}
        inputProps={{
          'aria-label': ariaLabel || placeholder || 'Formula input',
          ...inputProps,
          notation: getNotation(logicSystem),
          allowTherefore,
          mobile,
          onEnterKey,
          onFormulaKeyDown,
        }}
        sx={sx}
      />
      {mobile && (
        <PhoneFormulaKeyboard
          open={focused}
          inputRef={fieldRef}
          anchorRef={anchorRef}
          disabled={readOnly}
          symbolizationKey={symbolizationKey}
          includeQuantifiers={includeQuantifiers}
          extraInsertButtons={extraInsertButtons}
          predicateLetters={predicateLetters}
          constantLetters={constantLetters}
          variableLetters={variableLetters}
          logicSystem={logicSystem}
        />
      )}
    </>
  )
})

export default FormulaField

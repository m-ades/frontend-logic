import { forwardRef } from 'react'
import MobileLogicInput from '../../../ui/LogicKeyboard/MobileLogicInput.jsx'
import FormulaTextField from './FormulaTextField.jsx'
import useIsPhone from '../../../../hooks/useIsPhone.js'

// shared formula field for symbolic inputs
const FormulaField = forwardRef(function FormulaField({
  value,
  onValueChange,
  onBlur,
  readOnly = false,
  onEnterKey,
  placeholder = '',
  symbolizationKey,
  includeQuantifiers = true,
  extraInsertButtons,
  allowTherefore = false,
  predicateLetters,
  constantLetters,
  variableLetters,
  logicSystem,
  sx,
  'aria-label': ariaLabel,
}, ref) {
  const isPhone = useIsPhone()

  if (isPhone) {
    // on phones route back through the existing custom keyboard path
    return (
      <MobileLogicInput
        value={value}
        onChange={(nextValue) => onValueChange?.(nextValue)}
        onBlur={onBlur}
        disabled={readOnly}
        inputRef={ref}
        placeholder={placeholder}
        aria-label={ariaLabel || placeholder || 'Formula input'}
        symbolizationKey={symbolizationKey}
        includeQuantifiers={includeQuantifiers}
        extraInsertButtons={extraInsertButtons}
        onEnterKey={onEnterKey}
        predicateLetters={predicateLetters}
        constantLetters={constantLetters}
        variableLetters={variableLetters}
        logicSystem={logicSystem}
      />
    )
  }

  return (
    <FormulaTextField
      ref={ref}
      fullWidth
      value={value}
      onValueChange={onValueChange}
      onBlur={onBlur}
      onKeyDown={(event) => {
        if (readOnly || event.key !== 'Enter' || !onEnterKey) return
        event.preventDefault()
        onEnterKey()
      }}
      logicSystem={logicSystem}
      allowTherefore={allowTherefore}
      readOnly={readOnly}
      placeholder={placeholder}
      inputProps={{ 'aria-label': ariaLabel || placeholder || 'Formula input' }}
      sx={{
        '& .MuiInputBase-input': {
          fontFamily: 'var(--app-font-mono)',
          fontSize: '1rem',
        },
        ...sx,
      }}
    />
  )
})

export default FormulaField

import { forwardRef, useCallback } from 'react'
import { TextField, useMediaQuery } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import MobileLogicInput from '../../../ui/LogicKeyboard/MobileLogicInput.jsx'
import FormulaInput from '../../../ui/logicpenguin/formula-input.js'
import getSyntax from '../../../../lib/logicpenguin/symbolic/libsyntax.js'
import { getNotation } from '../../../../lib/logicSystems.js'

// shared formula field for symbolic inputs
const FormulaField = forwardRef(function FormulaField({
  value,
  onValueChange,
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
  const theme = useTheme()
  const isPhone = useMediaQuery(theme.breakpoints.down('sm'))
  const notation = getNotation(logicSystem)
  const syntax = getSyntax(notation)
  const registerInput = useCallback((input) => {
    if (input) {
      input.syntax = syntax
      input.notation = notation
      input.symbols = syntax.symbols
      input.inputfix = FormulaInput.formatForDisplay
      input.autoChange = FormulaInput.autoChange
      input.insertHere = FormulaInput.insertHere
      input.insOp = FormulaInput.insOp
      input.allowTherefore = allowTherefore
    }
    if (typeof ref === 'function') ref(input)
    else if (ref) ref.current = input
  }, [allowTherefore, notation, ref, syntax])

  if (isPhone) {
    // on phones route back through the existing custom keyboard path
    return (
      <MobileLogicInput
        value={value}
        onChange={(nextValue) => onValueChange?.(nextValue)}
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
    <TextField
      fullWidth
      value={value}
      onChange={(event) => onValueChange?.(event.target.value)}
      onKeyDown={(event) => {
        if (readOnly) return
        if (event.key === 'Enter' && onEnterKey) {
          event.preventDefault()
          onEnterKey()
          return
        }
        FormulaInput.keydown.call(event.target, event)
        if (event.target.value !== value) {
          onValueChange?.(event.target.value)
        }
      }}
      placeholder={placeholder}
      inputRef={registerInput}
      InputProps={{ readOnly }}
      inputProps={{
        autoComplete: 'off',
        spellCheck: false,
        'aria-label': ariaLabel || placeholder || 'Formula input',
      }}
      sx={{
        '& .MuiInputBase-input': {
          fontFamily: 'monospace',
          fontSize: '1rem',
        },
        ...sx,
      }}
    />
  )
})

export default FormulaField

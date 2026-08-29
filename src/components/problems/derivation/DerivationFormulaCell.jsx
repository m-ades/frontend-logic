import { Box, TableCell, TextField } from '@mui/material'
import { MobileLogicInput } from '../../ui/LogicKeyboard/index.js'
import DerivationFormulaText from './DerivationFormulaText.jsx'
import { isDerivationFieldReadOnly } from './derivationUtils.js'
import {
  DERIVATION_FORMULA_WIDTH,
  DERIVATION_FORMULA_MIN_WIDTH,
  DERIVATION_INDENT_STEP,
  DERIVATION_INDENT_STEP_REM,
  DERIVATION_LINE_FONT_SIZE,
  FITCH_LINE_WIDTH,
  getFitchLineColor,
} from './derivationTableConfig.js'

export default function DerivationFormulaCell({
  activeLogicSystem,
  depth,
  isFullScreen,
  isPhone,
  keyboardConfig,
  line,
  lineIndex,
  mobileKeyboardEnabled,
  onActivate,
  onChange,
  onCommit,
  onCursorChange,
  onInsert,
  onKeyDown,
  onMobileChange,
  onMobileCursorChange,
  onRequestFullScreen,
  registerInput,
  showsDivider,
  startsScope,
}) {
  const formulaReadOnly = isDerivationFieldReadOnly(line, 'formula')
  const basePadding = '0.5rem'
  const paddingLeft = depth > 0
    ? `calc(${basePadding} + ${depth} * ${DERIVATION_INDENT_STEP})`
    : basePadding
  const dividerLeft = startsScope
    ? `calc(${basePadding} + ${Math.max(0, depth - 1) * DERIVATION_INDENT_STEP_REM}rem)`
    : `-${FITCH_LINE_WIDTH}`

  return (
    <TableCell
      sx={{
        borderBottom: 'none',
        pl: paddingLeft,
        pr: 0.5,
        verticalAlign: 'middle',
        transition: 'padding-left 120ms ease',
        ...(isFullScreen
          ? { width: '50%', minWidth: 0 }
          : {
              width: { xs: DERIVATION_FORMULA_MIN_WIDTH, md: DERIVATION_FORMULA_WIDTH },
              minWidth: { xs: DERIVATION_FORMULA_MIN_WIDTH, md: DERIVATION_FORMULA_WIDTH },
              whiteSpace: 'nowrap',
            }),
      }}
    >
      {showsDivider && (
        <Box
          aria-hidden="true"
          sx={{
            position: 'absolute',
            left: dividerLeft,
            bottom: -1,
            pl: startsScope ? DERIVATION_INDENT_STEP : basePadding,
            pr: 0.25,
            borderBottom: `${FITCH_LINE_WIDTH} solid`,
            borderBottomColor: getFitchLineColor,
            fontSize: DERIVATION_LINE_FONT_SIZE,
            lineHeight: 'normal',
            whiteSpace: 'pre',
            pointerEvents: 'none',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            zIndex: 2,
          }}
        >
          <Box component="span" sx={{ visibility: 'hidden' }}>
            {line.formula || ' '}
          </Box>
        </Box>
      )}

      {depth > 0 && (
        <Box aria-hidden="true" sx={{ position: 'absolute', inset: 0, overflow: 'visible', pointerEvents: 'none', zIndex: 1 }}>
          {Array.from({ length: depth }, (_, scopeIndex) => (
            <Box
              key={`scope-${lineIndex}-${scopeIndex}`}
              sx={(theme) => ({
                position: 'absolute',
                top: startsScope && scopeIndex === depth - 1 ? 7 : -1,
                bottom: -1,
                left: `calc(${basePadding} + ${scopeIndex * DERIVATION_INDENT_STEP_REM}rem)`,
                width: FITCH_LINE_WIDTH,
                borderRadius: 1,
                bgcolor: getFitchLineColor(theme),
              })}
            />
          ))}
        </Box>
      )}

      {formulaReadOnly ? (
        <DerivationFormulaText
          text={line.formula}
          id={`formula-${lineIndex}`}
          onInsert={onInsert}
          sx={{
            display: isPhone && isFullScreen ? 'block' : 'inline',
            ...(isPhone && isFullScreen && {
              width: '100%',
              maxWidth: '100%',
              overflowX: 'auto',
              overflowY: 'hidden',
              whiteSpace: 'nowrap',
              WebkitOverflowScrolling: 'touch',
            }),
            py: 0.5,
          }}
        />
      ) : isPhone && mobileKeyboardEnabled ? (
        <MobileLogicInput
          value={line.formula ?? ''}
          onChange={onMobileChange}
          onFocus={onActivate}
          disabled={formulaReadOnly}
          onBlur={() => onCommit(line.formula ?? '')}
          placeholder="Statement"
          aria-label={`Formula line ${lineIndex + 1}`}
          inputRef={registerInput}
          onCursorChange={onMobileCursorChange}
          includeQuantifiers={keyboardConfig.isPredicateMode}
          extraInsertButtons={keyboardConfig.extraSymbolButtons}
          predicateLetters={keyboardConfig.isPredicateMode ? keyboardConfig.predicateLetters : undefined}
          constantLetters={keyboardConfig.isPredicateMode ? keyboardConfig.constantLetters : undefined}
          variableLetters={keyboardConfig.isPredicateMode ? keyboardConfig.variableLetters : undefined}
          symbolizationKey={keyboardConfig.symbolizationKey}
          logicSystem={activeLogicSystem}
        />
      ) : (
        <TextField
          variant="standard"
          placeholder="Statement"
          value={line.formula}
          onChange={onChange}
          onKeyDown={onKeyDown}
          onPointerDown={onRequestFullScreen}
          onClick={onCursorChange}
          onMouseUp={onCursorChange}
          onKeyUp={onCursorChange}
          onSelect={onCursorChange}
          onBlur={(event) => {
            onCursorChange(event)
            onCommit(event.target.value)
          }}
          InputProps={{ disableUnderline: true, readOnly: formulaReadOnly }}
          inputProps={{ autoComplete: 'off', 'aria-label': `Formula for line ${lineIndex + 1}` }}
          inputRef={registerInput}
          onFocus={(event) => {
            onActivate()
            onCursorChange(event)
          }}
          sx={{
            width: isFullScreen ? '100%' : { xs: '100%', md: DERIVATION_FORMULA_WIDTH },
            minWidth: isFullScreen ? 0 : undefined,
            '& .MuiInputBase-input': { fontSize: DERIVATION_LINE_FONT_SIZE, py: 0.5 },
          }}
        />
      )}
    </TableCell>
  )
}

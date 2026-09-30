import {
  Badge,
  Chip,
  FormControl,
  IconButton,
  MenuItem,
  Select,
  Stack,
  TableCell,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import CancelIcon from '@mui/icons-material/Cancel'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import ArrowLeftIcon from '@mui/icons-material/ArrowLeft'
import DerivationFormulaText from './DerivationFormulaText.jsx'
import {
  DERIVATION_CITATION_MIN_WIDTH,
  DERIVATION_JUSTIFICATION_MAX_WIDTH,
  DERIVATION_JUSTIFICATION_MIN_WIDTH,
  DERIVATION_LINE_FONT_SIZE,
  DERIVATION_RULE_WIDTH_DESKTOP,
  DERIVATION_RULE_WIDTH_MOBILE,
} from './derivationTableConfig.js'
import {
  formatJustificationLines,
  getRuleFromJustification,
  isDerivationFieldReadOnly,
} from './derivationUtils.js'

/*
a hidden copy of the text in data-text sizes the field so it widens instead of scrolling
the input itself is one character wide so only that copy and the minimum set the width
*/
const growWithText = (minWidth) => ({
  display: 'inline-grid',
  // font size here makes ch resolve against the line font and the hidden copy inherits it
  fontSize: DERIVATION_LINE_FONT_SIZE,
  minWidth,
  maxWidth: DERIVATION_JUSTIFICATION_MAX_WIDTH,
  '&::after': {
    content: 'attr(data-text) " "',
    gridArea: '1 / 1',
    height: 0,
    overflow: 'hidden',
    visibility: 'hidden',
    whiteSpace: 'pre',
  },
  '& > .MuiInputBase-root': { gridArea: '1 / 1', minWidth: 0 },
})
const justificationSize = growWithText(DERIVATION_JUSTIFICATION_MIN_WIDTH)
const citationSize = growWithText(DERIVATION_CITATION_MIN_WIDTH)
// browsers only draw the ellipsis once the field loses focus
const lineInputSx = { fontSize: DERIVATION_LINE_FONT_SIZE, py: 0.5, textOverflow: 'ellipsis' }
// a 2px outline matches the delete icon's stroke weight since chrome floors fractional borders
const dischargeChipSx = { borderRadius: 1, '&.MuiChip-outlined': { borderWidth: '2px' } }

export default function DerivationJustificationCell({
  activeFormulaIndex,
  allowedRules,
  assumptionRules,
  autoCheckEnabled,
  autoCheckStatus,
  canDischargeMore,
  citationDraft,
  conclusion,
  isDischarged,
  isFullScreen,
  isMobile,
  isPhone,
  line,
  lineIndex,
  onActivate,
  onCitationChange,
  onCitationCommit,
  onDelete,
  onInsert,
  onJustificationChange,
  onKeyDown,
  onRequestFullScreen,
  onRuleChange,
  onToggleDischarge,
  onTypedCommit,
  persistentUnderline = false,
  premisesCount,
  registerInput,
  showDischargeControl,
  useRuleDropdown,
  usesNestedSubderivations,
}) {
  const selectedRule = getRuleFromJustification(line.justification)
  const justificationReadOnly = isDerivationFieldReadOnly(line, 'justification')
  const omitsCitations = assumptionRules.has(selectedRule.toUpperCase())
  const isActiveLine = activeFormulaIndex === lineIndex
  const dischargeLabel = isDischarged > 1 ? `Discharged ×${isDischarged}` : isDischarged ? 'Discharged' : 'Discharge'
  const dischargeAction = !isDischarged ? 'Discharge subproof here'
    : canDischargeMore ? `${dischargeLabel}, click to close another`
      : `${dischargeLabel}, click to undo`
  const isPremise = lineIndex < premisesCount
  const ruleOptions = selectedRule && !allowedRules.some((rule) => (
    rule.toLowerCase() === selectedRule.toLowerCase()
  )) ? [selectedRule, ...allowedRules] : allowedRules
  // full screen phones fill the space beside the controls and squeeze before anything wraps
  const phoneShrink = isPhone && isFullScreen ? { minWidth: 0, flex: '1 1 auto' } : null
  const citationText = citationDraft ?? formatJustificationLines(line.justification)
  const typedPlaceholder = lineIndex === premisesCount
    ? (usesNestedSubderivations ? 'Rule & line(s)' : 'line(s) and rule')
    : ''
  const requestFullScreen = (event) => {
    if (justificationReadOnly) return
    onRequestFullScreen(event)
  }

  return (
    <TableCell
      sx={{
        borderBottom: 'none',
        pl: 0.5,
        verticalAlign: 'middle',
        ...(isFullScreen ? { width: '50%', minWidth: 0 } : { width: 'auto', whiteSpace: 'nowrap' }),
        '& .line-action': { transition: 'opacity 120ms ease' },
        '& .line-action:focus-visible': { opacity: 1 },
        '@media (hover: hover)': {
          '& .line-action': { opacity: 0 },
          '&:hover .line-action': { opacity: 1 },
        },
        /*
        touch screens can't hover so only the line being edited shows its actions
        hidden ones stop taking taps so a line can't be deleted blind
        */
        '@media (hover: none)': isActiveLine ? {} : {
          '& .line-action': { opacity: 0, pointerEvents: 'none' },
          '& .line-discharge': { display: 'none' },
        },
      }}
    >
      {isPremise ? (
        <Stack direction="row" spacing={1.5} alignItems="center">
          {usesNestedSubderivations ? (
            <Typography component="span" sx={{ fontSize: DERIVATION_LINE_FONT_SIZE, color: 'text.primary', fontWeight: 600 }}>
              PR
            </Typography>
          ) : lineIndex === premisesCount - 1 ? (
            <DerivationFormulaText
              text={conclusion}
              id={`conclusion-row-${lineIndex}`}
              onInsert={onInsert}
            />
          ) : (
            <Typography sx={{ color: 'transparent' }}>—</Typography>
          )}
        </Stack>
      ) : (
        <Stack direction="row" alignItems="center" sx={{ flexWrap: 'nowrap', columnGap: isPhone ? 0.5 : 0.75, minWidth: 0 }}>
          {useRuleDropdown ? (
            <>
              {!omitsCitations && (
                <TextField
                  variant="standard"
                  placeholder="Line(s)"
                  value={citationText}
                  data-text={citationText || 'Line(s)'}
                  onFocus={onActivate}
                  onPointerDown={requestFullScreen}
                  onChange={(event) => onCitationChange(event.target.value)}
                  onKeyDown={onKeyDown}
                  onBlur={(event) => onCitationCommit(event.target.value)}
                  InputProps={{ disableUnderline: true, readOnly: justificationReadOnly }}
                  inputProps={{
                    autoComplete: 'off',
                    size: 1,
                    'aria-label': `Referenced line numbers for line ${lineIndex + 1}`,
                  }}
                  inputRef={registerInput}
                  sx={{
                    order: usesNestedSubderivations ? -1 : -2,
                    ...citationSize,
                    ...phoneShrink,
                    '& .MuiInputBase-input': lineInputSx,
                  }}
                />
              )}
              {ruleOptions.length > 0 && (
                <FormControl
                  variant="standard"
                  sx={omitsCitations
                    ? { fontSize: DERIVATION_LINE_FONT_SIZE, minWidth: DERIVATION_JUSTIFICATION_MIN_WIDTH }
                    : {
                        order: usesNestedSubderivations ? -2 : -1,
                        minWidth: isFullScreen || isMobile
                          ? DERIVATION_RULE_WIDTH_MOBILE
                          : DERIVATION_RULE_WIDTH_DESKTOP,
                      }}
                >
                  <Select
                    value={selectedRule}
                    readOnly={justificationReadOnly}
                    displayEmpty
                    disableUnderline
                    inputProps={{ 'aria-label': `Rule for line ${lineIndex + 1}` }}
                    onFocus={onActivate}
                    onChange={(event) => onRuleChange(String(event.target.value || ''))}
                    renderValue={(value) => value || 'Rule'}
                    sx={{
                      width: omitsCitations ? '100%' : undefined,
                      '& .MuiSelect-select, & .MuiInputBase-input': {
                        fontSize: DERIVATION_LINE_FONT_SIZE,
                        py: 0.5,
                      },
                      '& .MuiSelect-select.MuiInputBase-input': { display: 'flex', alignItems: 'center' },
                    }}
                    MenuProps={{
                      PaperProps: { sx: { '& .MuiMenuItem-root': { fontSize: DERIVATION_LINE_FONT_SIZE } } },
                    }}
                  >
                    <MenuItem value=""><em>Rule</em></MenuItem>
                    {ruleOptions.map((rule) => <MenuItem key={rule} value={rule}>{rule}</MenuItem>)}
                  </Select>
                </FormControl>
              )}
            </>
          ) : (
            <TextField
              variant="standard"
              placeholder={typedPlaceholder}
              value={line.justification}
              data-text={line.justification || typedPlaceholder}
              onFocus={onActivate}
              onPointerDown={requestFullScreen}
              onChange={onJustificationChange}
              onKeyDown={onKeyDown}
              onBlur={(event) => onTypedCommit(event.target.value)}
              InputProps={{ readOnly: justificationReadOnly }}
              inputProps={{ autoComplete: 'off', size: 1, 'aria-label': `Justification for line ${lineIndex + 1}` }}
              inputRef={registerInput}
              sx={{
                ...justificationSize,
                ...phoneShrink,
                '& .MuiInputBase-input': lineInputSx,
                '& .MuiInput-root:before, & .MuiInput-root:after': {
                  right: 'auto',
                  width: '75%',
                  opacity: persistentUnderline ? 1 : 0,
                },
                'tr:focus-within & .MuiInput-root:before, tr:focus-within & .MuiInput-root:after': {
                  opacity: persistentUnderline || !justificationReadOnly ? 1 : 0,
                },
              }}
            />
          )}

          <Stack direction="row" alignItems="center" spacing={isPhone ? 0.25 : 0.75} sx={{ flexShrink: 0 }}>
            {autoCheckEnabled && autoCheckStatus === 'ok' && (
              <CheckCircleIcon fontSize="small" sx={{ color: 'primary.main' }} />
            )}
            {autoCheckEnabled && autoCheckStatus === 'error' && (
              <CancelIcon fontSize="small" color="error" />
            )}
            {showDischargeControl && (
              <Tooltip title={dischargeAction}>
                {isPhone ? (
                  // a bare symbol stays beside the justification instead of wrapping under it
                  <IconButton
                    onClick={onToggleDischarge}
                    size="small"
                    color={isDischarged ? 'primary' : 'default'}
                    aria-label={`${dischargeAction} on line ${lineIndex + 1}`}
                    aria-pressed={Boolean(isDischarged)}
                    className="line-action line-discharge"
                  >
                    <Badge badgeContent={isDischarged > 1 ? isDischarged : 0} color="primary">
                      <ArrowLeftIcon fontSize="small" />
                    </Badge>
                  </IconButton>
                ) : (
                  <Chip
                    label={dischargeLabel}
                    onClick={onToggleDischarge}
                    size="small"
                    clickable
                    color={isDischarged ? 'primary' : 'default'}
                    variant={isDischarged ? 'filled' : 'outlined'}
                    aria-label={`${dischargeAction} on line ${lineIndex + 1}`}
                    aria-pressed={Boolean(isDischarged)}
                    className="line-action line-discharge"
                    sx={dischargeChipSx}
                  />
                )}
              </Tooltip>
            )}
            {!line.readOnly && !line.formulaReadOnly && (
              <Tooltip title="Delete line">
                <IconButton
                  onClick={onDelete}
                  size="small"
                  aria-label={`Delete line ${lineIndex + 1}`}
                  className="line-action"
                >
                  <DeleteOutlineIcon />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
        </Stack>
      )}
    </TableCell>
  )
}

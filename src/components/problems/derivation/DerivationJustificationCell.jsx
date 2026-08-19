import {
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
import RemoveIcon from '@mui/icons-material/Remove'
import DerivationFormulaText from './DerivationFormulaText.jsx'
import {
  DERIVATION_JUSTIFICATION_WIDTH_SM,
  DERIVATION_JUSTIFICATION_WIDTH_XS,
  DERIVATION_LINE_FONT_SIZE,
  DERIVATION_RULE_WIDTH_DESKTOP,
  DERIVATION_RULE_WIDTH_MOBILE,
} from './derivationTableConfig.js'
import {
  formatJustificationLines,
  getRuleFromJustification,
} from './derivationUtils.js'

const justificationWidth = {
  width: { xs: DERIVATION_JUSTIFICATION_WIDTH_XS, sm: DERIVATION_JUSTIFICATION_WIDTH_SM },
  maxWidth: { xs: DERIVATION_JUSTIFICATION_WIDTH_XS, sm: DERIVATION_JUSTIFICATION_WIDTH_SM },
  minWidth: { xs: DERIVATION_JUSTIFICATION_WIDTH_XS, sm: DERIVATION_JUSTIFICATION_WIDTH_SM },
}

export default function DerivationJustificationCell({
  activeFormulaIndex,
  allowedRules,
  assumptionRules,
  autoCheckEnabled,
  autoCheckStatus,
  citationDraft,
  conclusion,
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
  onTypedCommit,
  premisesCount,
  registerInput,
  useRuleDropdown,
  usesNestedSubderivations,
}) {
  const selectedRule = getRuleFromJustification(line.justification)
  const isAssumption = assumptionRules.has(selectedRule.toUpperCase())
  const isPremise = lineIndex < premisesCount
  const ruleOptions = selectedRule && !allowedRules.some((rule) => (
    rule.toLowerCase() === selectedRule.toLowerCase()
  )) ? [selectedRule, ...allowedRules] : allowedRules
  const requestFullScreen = (event) => {
    if (line.readOnly) return
    onRequestFullScreen(event)
  }

  return (
    <TableCell
      sx={{
        borderBottom: 'none',
        pl: 0.5,
        verticalAlign: 'middle',
        ...(isFullScreen ? { width: '50%', minWidth: 0 } : { width: 'auto', whiteSpace: 'nowrap' }),
        '& .line-delete': {
          opacity: isPhone && isFullScreen ? Number(activeFormulaIndex === lineIndex) : 0,
          transition: 'opacity 120ms ease',
        },
        ...(!(isPhone && isFullScreen) && { '&:hover .line-delete': { opacity: 1 } }),
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
        <Stack direction="row" alignItems="center" sx={{ flexWrap: 'nowrap', gap: 0, minWidth: 0 }}>
          {useRuleDropdown ? (
            <>
              {!isAssumption && (
                <TextField
                  variant="standard"
                  placeholder="Line(s)"
                  value={citationDraft ?? formatJustificationLines(line.justification)}
                  onFocus={onActivate}
                  onPointerDown={requestFullScreen}
                  onChange={(event) => onCitationChange(event.target.value)}
                  onKeyDown={onKeyDown}
                  onBlur={(event) => onCitationCommit(event.target.value)}
                  InputProps={{ disableUnderline: true, readOnly: line.readOnly }}
                  inputProps={{
                    autoComplete: 'off',
                    'aria-label': `Referenced line numbers for line ${lineIndex + 1}`,
                  }}
                  inputRef={registerInput}
                  sx={{
                    order: usesNestedSubderivations ? -1 : -2,
                    width: '7ch',
                    maxWidth: '7ch',
                    minWidth: '7ch',
                    '& .MuiInputBase-input': { fontSize: DERIVATION_LINE_FONT_SIZE, py: 0.5 },
                  }}
                />
              )}
              {ruleOptions.length > 0 && (
                <FormControl
                  variant="standard"
                  sx={isAssumption
                    ? justificationWidth
                    : {
                        order: usesNestedSubderivations ? -2 : -1,
                        minWidth: isFullScreen || isMobile
                          ? DERIVATION_RULE_WIDTH_MOBILE
                          : DERIVATION_RULE_WIDTH_DESKTOP,
                      }}
                >
                  <Select
                    value={selectedRule}
                    displayEmpty
                    disableUnderline
                    inputProps={{ 'aria-label': `Rule for line ${lineIndex + 1}` }}
                    onFocus={onActivate}
                    onChange={(event) => onRuleChange(String(event.target.value || ''))}
                    renderValue={(value) => isAssumption ? '' : value || 'Rule'}
                    sx={{
                      width: isAssumption ? '100%' : undefined,
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
              placeholder={lineIndex === premisesCount
                ? (usesNestedSubderivations ? 'rule line(s)' : 'line(s) and rule')
                : ''}
              value={line.justification}
              onFocus={onActivate}
              onPointerDown={requestFullScreen}
              onChange={onJustificationChange}
              onKeyDown={onKeyDown}
              onBlur={(event) => onTypedCommit(event.target.value)}
              InputProps={{ disableUnderline: true, readOnly: line.readOnly }}
              inputProps={{ autoComplete: 'off', 'aria-label': `Justification for line ${lineIndex + 1}` }}
              inputRef={registerInput}
              sx={{
                ...justificationWidth,
                '& .MuiInputBase-input': { fontSize: DERIVATION_LINE_FONT_SIZE, py: 0.5 },
              }}
            />
          )}

          {autoCheckEnabled && autoCheckStatus === 'ok' && (
            <CheckCircleIcon fontSize="small" sx={{ color: 'primary.main' }} />
          )}
          {autoCheckEnabled && autoCheckStatus === 'error' && (
            <CancelIcon fontSize="small" color="error" />
          )}
          {!line.readOnly && (
            <Tooltip title="Delete line">
              <IconButton
                onClick={onDelete}
                size="small"
                aria-label={`Delete line ${lineIndex + 1}`}
                className="line-delete"
              >
                <RemoveIcon />
              </IconButton>
            </Tooltip>
          )}
        </Stack>
      )}
    </TableCell>
  )
}

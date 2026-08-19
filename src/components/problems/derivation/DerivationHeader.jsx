import { Box, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material'
import DerivationFormulaText from './DerivationFormulaText.jsx'

export default function DerivationHeader({
  allowedRules,
  argument,
  isFullScreen,
  onInsert,
  onRuleInputModeChange,
  ruleInputMode,
  usesNestedSubderivations,
}) {
  return (
    <>
      {argument && (
        <Box sx={{ mb: 2, ...(isFullScreen && { pl: 2 }) }}>
          <Typography
            component="h3"
            variant="overline"
            sx={{ display: 'block', mb: 0.5, color: 'text.secondary', fontWeight: 700, lineHeight: 1.2 }}
          >
            Argument
          </Typography>
          <Box sx={{ overflowX: 'auto', whiteSpace: 'nowrap' }}>
            <DerivationFormulaText text={argument} id="argument-target" onInsert={onInsert} />
          </Box>
        </Box>
      )}

      {(usesNestedSubderivations || allowedRules.length > 0) && (
        <Box sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', ...(isFullScreen && { pl: 2 }) }}>
          {usesNestedSubderivations && (
            <Typography
              component="h3"
              variant="overline"
              sx={{ mr: 0.5, color: 'text.secondary', fontWeight: 700, lineHeight: 1.2 }}
            >
              Derivation
            </Typography>
          )}
          {allowedRules.length > 0 && (
            <>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Rule input:
              </Typography>
              <ToggleButtonGroup
                value={ruleInputMode}
                exclusive
                onChange={onRuleInputModeChange}
                size="small"
                sx={{
                  border: 'none',
                  '& .MuiToggleButtonGroup-grouped': { border: 'none' },
                  '& .MuiToggleButton-root': {
                    py: 0.25,
                    px: 1.25,
                    fontSize: '0.8125rem',
                    border: 'none',
                    '&.Mui-selected': { fontWeight: 600 },
                  },
                }}
              >
                <ToggleButton value="type" aria-label="Type rule">TYPE</ToggleButton>
                <Typography component="span" variant="body2" sx={{ color: 'text.secondary', alignSelf: 'center', px: 0.5 }}>
                  or
                </Typography>
                <ToggleButton value="dropdown" aria-label="Select rule from dropdown">
                  SELECT FROM LIST
                </ToggleButton>
              </ToggleButtonGroup>
            </>
          )}
        </Box>
      )}
    </>
  )
}

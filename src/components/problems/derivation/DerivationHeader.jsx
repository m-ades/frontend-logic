import { Box, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material'
import MathJaxFormula from '../../ui/MathJaxFormula.jsx'
import { DERIVATION_LINE_FONT_SIZE } from './derivationTableConfig.js'

/**
 * renders the argument and rule controls above a derivation table
 * argument contains matching plain text and tex representations
 */
export default function DerivationHeader({
  allowedRules,
  argument,
  isFullScreen,
  onRuleInputModeChange,
  ruleInputMode,
  usesNestedSubderivations,
}) {
  return (
    <>
      {argument?.text && (
        <Box sx={{ mb: 2, ...(isFullScreen && { pl: 2 }) }}>
          <Typography
            component="h3"
            variant="overline"
            sx={{ display: 'block', mb: 0.5, color: 'text.secondary', fontWeight: 700, lineHeight: 1.2 }}
          >
            Argument
          </Typography>
          <Box sx={{ overflowX: 'auto', whiteSpace: 'nowrap', fontSize: DERIVATION_LINE_FONT_SIZE, lineHeight: 1.6 }}>
            <MathJaxFormula
              tex={argument.tex}
              fallback={argument.text}
              display={false}
              block
            />
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

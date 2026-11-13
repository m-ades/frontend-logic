import { Box } from '@mui/material'
import { alpha } from '@mui/material/styles'
import { DERIVATION_PROMPT_FONT_SIZE } from './derivationTableConfig.js'
import { MOBILE_DERIVATION_PLACEHOLDER_MSG } from './derivationUtils.js'

// phones edit derivations in fullscreen so the inline table becomes a tap target
export default function DerivationPhonePlaceholder({ onOpen }) {
  return (
    <Box
      component="button"
      type="button"
      onClick={onOpen}
      sx={{
        display: 'block',
        width: '100%',
        py: 3,
        px: 2,
        border: (t) => `1px solid ${t.palette.divider}`,
        borderRadius: 2,
        bgcolor: (t) => alpha(t.palette.primary.main, 0.04),
        color: 'primary.main',
        fontSize: DERIVATION_PROMPT_FONT_SIZE,
        lineHeight: 2,
        fontWeight: 400,
        cursor: 'pointer',
        textAlign: 'center',
        '&:hover': { bgcolor: (t) => alpha(t.palette.primary.main, 0.08) },
      }}
    >
      {MOBILE_DERIVATION_PLACEHOLDER_MSG}
    </Box>
  )
}

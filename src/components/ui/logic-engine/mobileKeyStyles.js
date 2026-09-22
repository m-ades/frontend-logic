import { alpha } from '@mui/material/styles'

const fill = (theme, light, dark) => (theme.palette.mode === 'dark' ? dark : light)

const hueTone = (paletteKey, lightFill, darkFill) => ({
  bgcolor: (theme) => alpha(theme.palette[paletteKey].main, fill(theme, lightFill, darkFill)),
  borderColor: (theme) => alpha(theme.palette[paletteKey].main, fill(theme, lightFill + 0.16, darkFill + 0.12)),
  color: 'text.primary',
  '@media (hover: hover) and (pointer: fine)': {
    '&:hover': {
      bgcolor: (theme) => alpha(theme.palette[paletteKey].main, fill(theme, lightFill + 0.07, darkFill + 0.08)),
      borderColor: (theme) => alpha(theme.palette[paletteKey].main, 0.5),
      boxShadow: 'none',
    },
  },
  '&:active': {
    bgcolor: (theme) => alpha(theme.palette[paletteKey].main, fill(theme, lightFill + 0.12, darkFill + 0.12)),
    borderColor: (theme) => theme.palette[paletteKey].main,
    boxShadow: 'none',
    transform: 'scale(0.97)',
  },
})

const utilityTone = (emphasis = false) => ({
  bgcolor: (theme) => (
    theme.palette.mode === 'dark'
      ? alpha(theme.palette.common.white, emphasis ? 0.14 : 0.08)
      : alpha(theme.palette.common.black, emphasis ? 0.08 : 0.04)
  ),
  borderColor: (theme) => (
    theme.palette.mode === 'dark'
      ? alpha(theme.palette.common.white, emphasis ? 0.28 : 0.16)
      : alpha(theme.palette.common.black, emphasis ? 0.18 : 0.1)
  ),
  color: 'text.primary',
  '@media (hover: hover) and (pointer: fine)': {
    '&:hover': {
      bgcolor: (theme) => (
        theme.palette.mode === 'dark'
          ? alpha(theme.palette.common.white, emphasis ? 0.2 : 0.12)
          : alpha(theme.palette.common.black, emphasis ? 0.12 : 0.07)
      ),
      boxShadow: 'none',
    },
  },
  '&:active': {
    transform: 'scale(0.97)',
    boxShadow: 'none',
  },
})

/** Shared layout for phone keys. Color comes from getMobileKeySx(kind). */
export const mobileKeyBaseSx = {
  minWidth: 0,
  width: '100%',
  px: 0.5,
  py: 0.85,
  fontSize: '1.05rem',
  lineHeight: 1.1,
  minHeight: 44,
  fontWeight: 650,
  textTransform: 'none',
  boxShadow: 'none',
  border: '1px solid',
  borderRadius: 2,
  transition: (theme) => theme.transitions.create(
    ['background-color', 'border-color', 'transform', 'box-shadow'],
    { duration: 120 }
  ),
  '@media (prefers-reduced-motion: reduce)': {
    transition: 'none',
    '&:active': { transform: 'none' },
  },
}

const mobileKeyToneSx = {
  connective: hueTone('primary', 0.12, 0.24),
  grouping: hueTone('info', 0.1, 0.22),
  extra: hueTone('primary', 0.06, 0.16),
  predicate: hueTone('warning', 0.18, 0.22),
  constant: hueTone('success', 0.14, 0.2),
  variable: hueTone('info', 0.12, 0.22),
  letter: hueTone('primary', 0.08, 0.2),
  nav: utilityTone(false),
  backspace: utilityTone(true),
}

export const getMobileKeySx = (kind = 'letter') => [
  mobileKeyBaseSx,
  mobileKeyToneSx[kind] || mobileKeyToneSx.letter,
]

export const mobileKeyGridSx = (columns) => ({
  display: 'grid',
  gridTemplateColumns: `repeat(${Math.max(1, columns)}, minmax(0, 1fr))`,
  gap: 0.55,
  width: '100%',
})

export const mobileKeyWellSx = (kind = 'letters') => {
  const tint = {
    operators: { light: 0.035, dark: 0.06 },
    letters: { light: 0.03, dark: 0.05 },
    nav: { light: 0.025, dark: 0.045 },
  }[kind] || { light: 0.03, dark: 0.05 }

  return {
    width: '100%',
    p: 0.65,
    borderRadius: 2.5,
    border: '1px solid',
    borderColor: (theme) => alpha(theme.palette.divider, theme.palette.mode === 'dark' ? 0.9 : 1),
    bgcolor: (theme) => (
      theme.palette.mode === 'dark'
        ? alpha(theme.palette.common.white, tint.dark)
        : alpha(theme.palette.common.black, tint.light)
    ),
  }
}

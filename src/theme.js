import { createTheme } from '@mui/material/styles'
import tinycolor from 'tinycolor2'

const themes = new Map()

function accentColor(main) {
  return {
    main,
    light: tinycolor(main).lighten(7.5).toHexString(),
    dark: tinycolor(main).darken(15).toHexString(),
  }
}

/*
 * returns a shared mui theme built once per mode
 * dark selects dark mode and any other value selects light without throwing
 * callers must treat the returned theme as read only
 */
export function getAppTheme(themeName) {
  const mode = themeName === 'dark' ? 'dark' : 'light'
  if (themes.has(mode)) return themes.get(mode)

  const isDark = mode === 'dark'
  const palette = {
    mode,
    primary: accentColor('#536DFE'),
    secondary: {
      ...accentColor(isDark ? '#EE266D' : '#FF5C93'),
      contrastText: isDark ? '#fff' : '#ccc',
    },
    warning: accentColor(isDark ? '#E9B55F' : '#FFC260'),
    success: accentColor(isDark ? '#63C5B5' : '#3CD4A0'),
    info: accentColor(isDark ? '#AE1ECC' : '#9013FE'),
    text: {
      primary: isDark ? '#fff' : '#4A4A4A',
      secondary: isDark ? '#D6D6D6' : '#6E6E6E',
      hint: isDark ? '#76767B' : '#B9B9B9',
    },
    background: {
      default: isDark ? '#13131A' : '#F6F7FF',
      paper: isDark ? '#23232D' : '#FFFFFF',
      light: isDark ? '#23232D' : '#F3F5FF',
    },
    divider: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(224, 224, 224, 0.5)',
  }
  const customShadows = {
    widget: isDark
      ? '0px 1px 8px rgba(0, 0, 0, 0.103475), 0px 3px 3px rgba(0, 0, 0, 0.0988309), 0px 3px 4px rgba(0, 0, 0, 0.10301)'
      : '0px 12px 33px 0px #E8EAFC, 0 3px 3px -2px #B2B2B21A, 0 1px 8px 0 #9A9A9A1A',
    widgetWide: isDark
      ? '0px 1px 12px rgba(0, 0, 0, 0.15), 0px 3px 3px rgba(0, 0, 0, 0.12), 0px 3px 6px rgba(0, 0, 0, 0.15)'
      : '0px 12px 40px 0px #E8EAFC, 0 3px 3px -2px #B2B2B21A, 0 1px 8px 0 #9A9A9A1A',
  }

  const theme = createTheme({
    palette,
    customShadows,
    typography: {
      fontFamily: '"IBM Plex Sans", sans-serif',
      h1: { fontSize: '3rem' },
      h2: { fontSize: '2rem' },
      h3: { fontSize: '1.64rem' },
      h4: { fontSize: '1.5rem', fontWeight: 600, letterSpacing: '-0.02em' },
      h5: { fontSize: '1.285rem', fontWeight: 600, letterSpacing: '-0.01em' },
      h6: { fontSize: '1.142rem', fontWeight: 600 },
      subtitle1: { fontWeight: 500 },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          '[class*="material-symbols"]': {
            fontFamily: 'Material Symbols Outlined',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: isDark ? {
            backgroundColor: palette.background.paper,
            boxShadow: `${customShadows.widget} !important`,
          } : {},
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: isDark ? {
            backgroundColor: `${palette.background.paper} !important`,
          } : {},
        },
      },
      MuiButton: {
        styleOverrides: {
          root: isDark ? { boxShadow: 'none !important' } : {},
        },
      },
      MuiCheckbox: {
        styleOverrides: {
          root: isDark ? { color: palette.text.hint } : {},
        },
      },
      MuiCard: {
        styleOverrides: {
          root: { boxShadow: 'none' },
        },
      },
      MuiBackdrop: {
        styleOverrides: {
          root: { backgroundColor: '#4A4A4A1A' },
        },
      },
      MuiMenu: {
        styleOverrides: {
          paper: {
            boxShadow:
              '0px 3px 11px 0px #E8EAFC, 0 3px 3px -2px #B2B2B21A, 0 1px 8px 0 #9A9A9A1A',
          },
        },
      },
      MuiSelect: {
        styleOverrides: {
          icon: { color: '#B9B9B9' },
        },
      },
      MuiListItem: {
        styleOverrides: {
          root: {
            '&.Mui-selected': {
              backgroundColor: '#F3F5FF !important',
            },
          },
          button: {
            '&:hover, &:focus': {
              backgroundColor: '#F3F5FF',
            },
          },
        },
      },
      MuiTouchRipple: {
        styleOverrides: {
          child: { backgroundColor: 'white' },
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: { height: 56 },
        },
      },
      MuiTableCell: {
        // keep the existing table density in each mode
        styleOverrides: isDark ? {
          head: { color: palette.text.hint },
        } : {
          root: {
            borderBottom: `1px solid ${palette.divider}`,
            padding: '14px 40px 14px 24px',
          },
          head: { fontSize: '0.95rem' },
          body: { fontSize: '0.95rem' },
          paddingCheckbox: { padding: '0 0 0 15px' },
        },
      },
      MuiTableSortLabel: {
        styleOverrides: {
          root: isDark ? {
            '&.Mui-active, &.Mui-active .MuiTableSortLabel-icon': {
              color: `${palette.text.hint} !important`,
            },
          } : {},
          icon: isDark ? { color: palette.text.hint } : {},
        },
      },
      MuiTablePagination: {
        styleOverrides: {
          toolbar: isDark ? { color: palette.text.hint } : {},
          selectIcon: isDark ? { color: palette.text.hint } : {},
        },
      },
      MuiAccordion: {
        styleOverrides: {
          root: {
            '&:before': { display: 'none' },
          },
        },
      },
    },
  })

  themes.set(mode, theme)
  return theme
}

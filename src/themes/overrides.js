const overrides = {
  typography: {
    fontFamily: '"IBM Plex Sans", sans-serif',
    h1: {
      fontSize: '3rem',
    },
    h2: {
      fontSize: '2rem',
    },
    h3: {
      fontSize: '1.64rem',
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 600,
      letterSpacing: '-0.02em',
    },
    h5: {
      fontSize: '1.285rem',
      fontWeight: 600,
      letterSpacing: '-0.01em',
    },
    h6: {
      fontSize: '1.142rem',
      fontWeight: 600,
    },
    subtitle1: {
      fontWeight: 500,
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          fontFamily: '"IBM Plex Sans", sans-serif',
        },
        '.material-symbols-outlined': {
          fontFamily: 'Material Symbols Outlined',
        },
        '[class*="material-symbols"]': {
          fontFamily: 'Material Symbols Outlined',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: 'none',
        },
      },
    },
    MuiBackdrop: {
      styleOverrides: {
        root: {
          backgroundColor: '#4A4A4A1A',
        },
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
        icon: {
          color: '#B9B9B9',
        },
      },
    },
    MuiListItem: {
      styleOverrides: {
        root: {
          '&.Mui-selected': {
            backgroundColor: '#F3F5FF !important',
            '&:focus': {
              backgroundColor: '#F3F5FF',
            },
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
        child: {
          backgroundColor: 'white',
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          height: 56,
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: '1px solid rgba(224, 224, 224, .5)',
          padding: '14px 40px 14px 24px',
        },
        head: {
          fontSize: '0.95rem',
        },
        body: {
          fontSize: '0.95rem',
        },
        paddingCheckbox: {
          padding: '0 0 0 15px',
        },
      },
    },
    MuiAccordion: {
      styleOverrides: {
        root: {
          '&:before': {
            display: 'none',
          },
        },
      },
    },
  },
}

const darkModeOverrides = {
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        '*::-webkit-scrollbar': {
          width: '0.4em',
        },
        '*::-webkit-scrollbar-thumb': {
          backgroundColor: '#12121A',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: '#23232D',
          boxShadow:
            '0px 1px 8px rgba(0, 0, 0, 0.103475), 0px 3px 3px rgba(0, 0, 0, 0.0988309), 0px 3px 4px rgba(0, 0, 0, 0.10301) !important',
          '&::-webkit-scrollbar': {
            width: '0.4em',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: '#12121A',
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#23232D !important',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          boxShadow: 'none !important',
        },
      },
    },
    MuiCheckbox: {
      styleOverrides: {
        root: {
          color: '#76767B',
        },
      },
    },
    MuiTable: {
      styleOverrides: {
        root: {
          '&::-webkit-scrollbar': {
            width: '0.4em',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: '#12121A',
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          color: '#76767B',
        },
      },
    },
    MuiTableBody: {
      styleOverrides: {
        root: {
          '&::-webkit-scrollbar': {
            width: '0.4em',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: '#12121A',
          },
        },
      },
    },
    MuiTableSortLabel: {
      styleOverrides: {
        root: {
          '&.Mui-active': {
            color: '#76767B !important',
          },
          '&.Mui-active .MuiTableSortLabel-icon': {
            color: '#76767B !important',
          },
        },
        icon: {
          color: '#76767B',
        },
      },
    },
    MuiTablePagination: {
      styleOverrides: {
        toolbar: {
          color: '#76767B',
        },
        selectIcon: {
          color: '#76767B',
        },
      },
    },
  },
}

// merge dark mode overrides when needed
export const getOverrides = (isDark) => {
  if (isDark) {
    return {
      ...overrides,
      components: {
        ...overrides.components,
        ...darkModeOverrides.components,
      },
    }
  }
  return overrides
}

export { darkModeOverrides }
export default overrides

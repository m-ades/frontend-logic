import { Box } from '@mui/material'

const focusTarget = (href) => {
  if (!href?.startsWith('#')) return
  const target = document.getElementById(href.slice(1))
  if (!target) return
  target.focus({ preventScroll: true })
  target.scrollIntoView({ block: 'start' })
}

export default function SkipLinks({ items = [] }) {
  const visibleItems = items.filter(Boolean)
  if (visibleItems.length === 0) return null

  return (
    <Box
      component="nav"
      aria-label="Skip links"
      sx={{
        position: 'fixed',
        top: 8,
        left: 8,
        zIndex: (theme) => theme.zIndex.tooltip + 1,
        display: 'flex',
        gap: 1,
        flexWrap: 'wrap',
        maxWidth: 'calc(100vw - 16px)',
        transform: 'translateY(-150%)',
        transition: 'transform 120ms ease',
        '&:focus-within': {
          transform: 'translateY(0)',
        },
      }}
    >
      {visibleItems.map(({ href, label }) => (
        <Box
          key={href}
          component="a"
          href={href}
          onClick={() => focusTarget(href)}
          sx={{
            px: 1.5,
            py: 1,
            borderRadius: 1,
            bgcolor: 'background.paper',
            color: 'primary.main',
            border: '2px solid',
            borderColor: 'primary.main',
            boxShadow: 3,
            fontWeight: 700,
            textDecoration: 'none',
            '&:focus-visible': {
              outline: '3px solid',
              outlineColor: 'secondary.main',
              outlineOffset: 2,
            },
          }}
        >
          {label}
        </Box>
      ))}
    </Box>
  )
}

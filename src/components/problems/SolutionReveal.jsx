import { Box, Typography, Paper } from '@mui/material'

function renderLines(lines) {
  return (
    <Box
      component="ol"
      sx={{
        pl: 3,
        my: 0,
        fontFamily: '"IBM Plex Mono", monospace',
        fontSize: '0.95rem',
        lineHeight: 1.6
      }}
    >
      {lines.map((line, idx) => {
        const lineNo = line?.n ?? line?.line ?? idx + 1
        const statement = line?.s ?? line?.formula ?? line?.statement ?? ''
        const justification = line?.j ?? line?.justification ?? line?.rule ?? ''
        return (
          <li key={`${lineNo}-${idx}`}>
            <Box component="span" sx={{ mr: 1 }}>{statement}</Box>
            {justification && (
              <Box component="span" sx={{ color: 'text.secondary' }}>
                [{justification}]
              </Box>
            )}
          </li>
        )
      })}
    </Box>
  )
}

function renderSolution({ solution, children }) {
  if (solution?.lines && Array.isArray(solution.lines)) {
    return (
      <Paper variant="outlined" sx={{ p: 2 }}>
        {renderLines(solution.lines)}
      </Paper>
    )
  }

  if (children) {
    return children
  }

  if (solution !== null && solution !== undefined) {
    return (
      <Box
        component="pre"
        sx={{
          m: 0,
          fontFamily: '"IBM Plex Mono", monospace',
          fontSize: '0.9rem',
          whiteSpace: 'pre-wrap'
        }}
      >
        {JSON.stringify(solution, null, 2)}
      </Box>
    )
  }

  return null
}

export default function SolutionReveal({ show = false, solution, title = 'Correct Answer', children }) {
  if (!show) return null

  const content = renderSolution({ solution, children })
  if (!content) return null

  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: '800px',
        mx: 'auto',
        mt: 3
      }}
    >
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#2f6bff' }}>
        {title}
      </Typography>
      {content}
    </Box>
  )
}

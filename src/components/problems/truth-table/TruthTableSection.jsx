import { Box, Typography } from '@mui/material'

export default function TruthTableSection({ title, children }) {
  return (
    <Box sx={{ mt: 2 }}>
      <Typography component="p" variant="subtitle1" sx={{ fontWeight: 600, color: 'primary.main' }}>
        {title}
      </Typography>
      <Box sx={{ mt: 2 }}>
        {children}
      </Box>
    </Box>
  )
}

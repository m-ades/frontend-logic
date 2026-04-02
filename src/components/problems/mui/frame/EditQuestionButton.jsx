import { Box, IconButton, Tooltip } from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'

export default function EditQuestionButton({
  onClick,
  top = { xs: 10, md: 14 },
  right = { xs: 10, md: 14 },
}) {
  if (!onClick) return null

  return (
    <Box sx={{ position: 'absolute', top, right, zIndex: 1 }}>
      <Tooltip title="Edit question">
        <IconButton
          size="small"
          onClick={onClick}
          aria-label="Edit question"
          sx={{ color: 'text.secondary', '&:hover': { opacity: 0.8 } }}
        >
          <EditIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Box>
  )
}

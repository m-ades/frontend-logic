import { Box, Card, Stack, Tooltip } from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import StatusBanner, { isTerminalStatus } from '../../../ui/StatusBanner.jsx'
import PromptText from '../../../ui/PromptText.jsx'

// shared shell for migrated problem cards
export const promptTextSx = { flex: 1 }
export const choiceLabelSx = {
  '& .MuiFormControlLabel-label': { fontSize: '1rem' },
}
export const choiceLabelWithGapSx = {
  ...choiceLabelSx,
  mb: 1,
}
export const sectionLabelSx = {
  mb: 1,
  color: 'text.secondary',
  fontSize: '0.875rem',
  lineHeight: 1.2,
}

export function ProblemCard({ minHeight = '150px', cardMaxWidth = '100%', cardSx, children, ...props }) {
  return (
    <Box sx={{ width: '100%', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
      <Card
        elevation={0}
        sx={{
          boxShadow: (theme) => theme.customShadows?.widget || theme.shadows[2],
          backgroundColor: 'background.paper',
          minWidth: 0,
          minHeight: 0,
          overflow: 'visible',
          minHeight,
          flexGrow: 1,
          alignSelf: 'stretch',
          width: '100%',
          maxWidth: cardMaxWidth,
          ...cardSx,
        }}
        {...props}
      >
        {children}
      </Card>
    </Box>
  )
}

export default function ProblemFrame({
  problemLabel,
  prompt = '',
  promptSx,
  minHeight = '150px',
  isInstructorView = false,
  onEditQuestion,
  status,
  message,
  onCloseStatus,
  statusNode,
  actionNode,
  editorNode,
  cardMaxWidth,
  cardSx,
  children,
}) {
  const resolvedPromptSx = promptSx ? { ...promptTextSx, ...promptSx } : promptTextSx
  const frameSx = {
    width: '100%',
    maxWidth: cardMaxWidth || '100%',
    alignSelf: 'flex-start',
  }

  return (
    <Stack spacing={3} sx={{ px: 0, width: '100%', alignItems: 'stretch', flexGrow: 1 }}>
      <Box sx={frameSx}>
        <ProblemCard minHeight={minHeight} cardMaxWidth="100%" cardSx={cardSx}>
            <Stack spacing={1.5} sx={{ px: { xs: 2, md: 2 }, pb: { xs: 2, md: 2 }, pt: { xs: 1.125, md: 1.375 }, position: 'relative' }}>
              {problemLabel && (
                <Box sx={{ color: 'text.secondary', fontSize: '0.875rem', lineHeight: 1.2, pr: 4 }}>
                  {problemLabel}
                </Box>
              )}
              {isInstructorView && onEditQuestion && (
                <Box sx={{ position: 'absolute', top: { xs: 10, md: 14 }, right: { xs: 10, md: 14 }, zIndex: 1 }}>
                  <Tooltip title="Edit question">
                    <Box
                      component="span"
                      onClick={onEditQuestion}
                      role="button"
                      aria-label="Edit question"
                      sx={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer', color: 'text.secondary', '&:hover': { opacity: 0.8 } }}
                    >
                      <EditIcon fontSize="small" />
                    </Box>
                  </Tooltip>
                </Box>
              )}
              {prompt && (
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
                  <PromptText content={prompt} sx={resolvedPromptSx} />
                </Box>
              )}
              {children}
            </Stack>
        </ProblemCard>

        {statusNode ?? (
          isTerminalStatus(status) && (
            <StatusBanner
              status={status}
              message={message}
              onClose={onCloseStatus}
            />
          )
        )}

        {actionNode}
        {editorNode}
      </Box>
    </Stack>
  )
}

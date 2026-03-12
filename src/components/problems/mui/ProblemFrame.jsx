import { Box, Stack, Tooltip } from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import StatusBanner, { isTerminalStatus } from '../../ui/StatusBanner.jsx'
import PromptText from '../../ui/PromptText.jsx'
import ThemedCard from '../../ui/ThemedCard.jsx'

// shared shell for migrated problem cards
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
  cardSx,
  children,
}) {
  return (
    <Stack spacing={3} sx={{ px: 0, width: '100%', alignItems: 'stretch', flexGrow: 1 }}>
      <Box className="logicpenguin" sx={{ width: '100%', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        {/* keep old class hooks while we phase out legacy ui */}
        <ThemedCard
          className="lp-problem-card"
          sx={{
            overflow: 'visible',
            minHeight,
            flexGrow: 1,
            alignSelf: { xs: 'stretch', md: 'flex-start' },
            ...cardSx,
          }}
        >
          <Stack spacing={3} sx={{ p: { xs: 2, md: 2 } }}>
            {problemLabel && (
              <Box sx={{ color: 'text.secondary', fontSize: '0.875rem', lineHeight: 1.2 }}>
                {problemLabel}
              </Box>
            )}
            {isInstructorView && onEditQuestion && (
              <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
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
                <PromptText content={prompt} sx={promptSx} />
              </Box>
            )}
            {children}
          </Stack>
        </ThemedCard>
      </Box>

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
    </Stack>
  )
}

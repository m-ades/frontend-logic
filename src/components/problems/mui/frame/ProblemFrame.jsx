import { Box, Card, Stack } from '@mui/material'
import StatusBanner, { isTerminalStatus } from '../../../ui/StatusBanner.jsx'
import PromptText from '../../../ui/PromptText.jsx'
import EditQuestionButton from './EditQuestionButton.jsx'

// problem frame owns shared card prompt feedback action and editor placement
// callers own only question specific content and checker behavior
// optional regions render nothing when omitted
// content sized frames shrink to intrinsic width without exceeding their parent
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
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
          boxShadow: (theme) => theme.customShadows?.widget || theme.shadows[2],
          backgroundColor: 'background.paper',
          minWidth: 0,
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
  contentSized = false,
  children,
}) {
  const resolvedPromptSx = promptSx ? { ...promptTextSx, ...promptSx } : promptTextSx
  const frameSx = {
    width: contentSized ? 'fit-content' : '100%',
    maxWidth: cardMaxWidth || '100%',
    alignSelf: 'flex-start',
  }
  const resolvedCardSx = contentSized
    ? { width: 'fit-content', maxWidth: '100%', alignSelf: 'flex-start', ...cardSx }
    : cardSx

  return (
    <Stack spacing={3} sx={{ px: 0, width: '100%', alignItems: contentSized ? 'flex-start' : 'stretch', flexGrow: 1 }}>
      <Box sx={frameSx}>
        <ProblemCard minHeight={minHeight} cardMaxWidth="100%" cardSx={resolvedCardSx}>
            <Stack spacing={1.5} sx={{ px: { xs: 2, md: 2 }, pb: { xs: 2, md: 2 }, pt: { xs: 1.125, md: 1.375 }, position: 'relative' }}>
              {problemLabel && (
                <Box sx={{ color: 'text.secondary', fontSize: '0.875rem', lineHeight: 1.2, pr: 4 }}>
                  {problemLabel}
                </Box>
              )}
              {isInstructorView && onEditQuestion && (
                <EditQuestionButton onClick={onEditQuestion} />
              )}
              {prompt && (
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
                  <PromptText content={prompt} sx={resolvedPromptSx} />
                </Box>
              )}
              {children}
            </Stack>
        </ProblemCard>
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

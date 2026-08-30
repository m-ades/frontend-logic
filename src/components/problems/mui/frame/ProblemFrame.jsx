import { Box, Card, Stack } from '@mui/material'
import StatusBanner, { isTerminalStatus } from '../../../ui/StatusBanner.jsx'
import PromptText from '../../../ui/PromptText.jsx'
import EditQuestionButton from './EditQuestionButton.jsx'

// problem frame owns shared card prompt feedback action and editor placement
// callers own only question specific content and checker behavior
// optional regions render nothing when omitted
// ordinary frames use the default reading width unless callers provide another limit
// expanding frames start at that width and grow for intrinsically wide content
// every card starts at the default minimum height and grows with its content
export const DEFAULT_QUESTION_CARD_WIDTH = '57.5rem'
export const DEFAULT_QUESTION_CARD_MIN_HEIGHT = '15rem'
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

export function ProblemCard({ minHeight = DEFAULT_QUESTION_CARD_MIN_HEIGHT, cardMaxWidth = '100%', cardSx, children, ...props }) {
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
  minHeight = DEFAULT_QUESTION_CARD_MIN_HEIGHT,
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
  expandForContent = false,
  children,
}) {
  const resolvedPromptSx = promptSx ? { ...promptTextSx, ...promptSx } : promptTextSx
  const defaultWidth = cardMaxWidth || DEFAULT_QUESTION_CARD_WIDTH
  const frameSx = {
    width: expandForContent ? 'fit-content' : `min(100%, ${defaultWidth})`,
    minWidth: expandForContent ? `min(100%, ${defaultWidth})` : 0,
    maxWidth: '100%',
    alignSelf: 'flex-start',
  }
  const resolvedCardSx = expandForContent
    ? { width: 'fit-content', minWidth: '100%', maxWidth: '100%', alignSelf: 'flex-start', ...cardSx }
    : cardSx

  return (
    <Stack spacing={3} sx={{ ...frameSx, px: 0, alignItems: 'stretch' }}>
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

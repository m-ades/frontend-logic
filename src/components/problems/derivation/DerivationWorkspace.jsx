import { Box, Table, TableBody, TableContainer, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material'
import { alpha } from '@mui/material/styles'
import PromptText from '../../ui/PromptText.jsx'
import EditQuestionButton from '../mui/frame/EditQuestionButton.jsx'
import { ProblemCard } from '../mui/frame/ProblemFrame.jsx'
import { MOBILE_DERIVATION_PLACEHOLDER_MSG } from './derivationUtils.js'

export default function DerivationWorkspace({
  allowedRules,
  canOpenFullScreen,
  children,
  feedbackNode,
  handleRuleInputModeChange,
  isFullScreen,
  isInstructorView,
  isMobile,
  isPhone,
  onEditQuestion,
  onOpenFullScreen,
  problemLabel,
  prompt,
  ruleInputMode,
}) {
  const Wrapper = isFullScreen ? Box : ProblemCard
  const cardSx = {
    px: { xs: 1.25, md: 2.5 },
    pb: { xs: 1.25, md: 2.5 },
    pt: { xs: 0.625, md: 1 },
    position: 'relative',
  }
  const wrapperSx = isFullScreen
    ? {
        py: 2,
        pl: 0,
        pr: 0,
        position: 'relative',
        flex: 1,
        minHeight: 0,
        minWidth: 0,
        width: '100%',
        maxWidth: '100%',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        overflowY: 'auto',
        overflowX: 'hidden',
      }
    : undefined

  return (
    <Wrapper {...(isFullScreen ? { sx: wrapperSx } : { minHeight: 'auto', cardSx })}>
      {isInstructorView && onEditQuestion && !isFullScreen && (
        <EditQuestionButton onClick={onEditQuestion} />
      )}
      {problemLabel && !isFullScreen && (
        <Box sx={{ mb: 0.75, color: 'text.secondary', fontSize: '0.875rem', lineHeight: 1.2, pr: 4 }}>
          {problemLabel}
        </Box>
      )}
      {prompt && !isFullScreen && (
        <Box sx={{ mb: 0.75, display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
          <PromptText content={prompt} sx={{ fontSize: '1.171875rem', flex: 1 }} />
        </Box>
      )}
      {isPhone && !isFullScreen && canOpenFullScreen ? (
        <Box
          component="button"
          type="button"
          onClick={() => onOpenFullScreen(null)}
          sx={{
            display: 'block',
            width: '100%',
            py: 3,
            px: 2,
            border: (theme) => `1px solid ${theme.palette.divider}`,
            borderRadius: 2,
            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.04),
            color: 'primary.main',
            fontSize: '1.171875rem',
            lineHeight: 2,
            fontWeight: 400,
            cursor: 'pointer',
            textAlign: 'center',
            '&:hover': { bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08) },
          }}
        >
          {MOBILE_DERIVATION_PLACEHOLDER_MSG}
        </Box>
      ) : (
        <>
          {allowedRules.length > 0 && (
            <Box sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap', ...(isFullScreen && { pl: 2 }) }}>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Rule input:
              </Typography>
              <ToggleButtonGroup
                value={ruleInputMode}
                exclusive
                onChange={handleRuleInputModeChange}
                size="small"
                sx={{
                  border: 'none',
                  '& .MuiToggleButtonGroup-grouped': { border: 'none' },
                  '& .MuiToggleButton-root': {
                    py: 0.25,
                    px: 1.25,
                    fontSize: '0.8125rem',
                    border: 'none',
                    '&.Mui-selected': { fontWeight: 600 },
                  },
                }}
              >
                <ToggleButton value="type" aria-label="Type rule">
                  TYPE
                </ToggleButton>
                <Typography component="span" variant="body2" sx={{ color: 'text.secondary', alignSelf: 'center', px: 0.5 }}>
                  or
                </Typography>
                <ToggleButton value="dropdown" aria-label="Select rule from dropdown">
                  SELECT FROM LIST
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>
          )}
          <TableContainer
            component={Box}
            sx={{
              width: '100%',
              ...(isFullScreen ? { overflowX: 'hidden', overflow: 'visible', padding: 0, margin: 0 } : { overflowX: 'auto', WebkitOverflowScrolling: 'touch' }),
            }}
          >
            <Table
              size={isMobile ? 'small' : 'medium'}
              sx={
                isFullScreen
                  ? {
                      tableLayout: 'fixed',
                      width: '100%',
                      '& td:last-child': { paddingRight: '0 !important' },
                      '& .MuiTableCell-root:last-child': { paddingRight: '0 !important' },
                    }
                  : { width: 'auto', minWidth: isMobile ? 200 : 280 }
              }
            >
              <TableBody>{children}</TableBody>
            </Table>
          </TableContainer>
          {feedbackNode}
        </>
      )}
    </Wrapper>
  )
}

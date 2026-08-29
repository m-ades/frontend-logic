import { Box, ButtonBase, Chip, LinearProgress, Stack, Typography } from '@mui/material'
import LockIcon from '@mui/icons-material/Lock'

// single-line-ish activity row shared by Assignments and Practice

export default function ActivityRow({
  title,
  description,
  isLocked = false,
  totalQuestions = 0,
  completedQuestions = 0,
  progressAriaLabel,
  chips = [],
  dateLabel,
  noteLines = [],
  onClick,
}) {
  const total = Math.max(Number(totalQuestions) || 0, 0)
  const completed = Math.min(Math.max(Number(completedQuestions) || 0, 0), total)
  const completionValue = total > 0 ? (completed / total) * 100 : 0
  const hasDateColumn = Boolean(dateLabel) || noteLines.length > 0
  const anchorChip = chips[chips.length - 1]
  const stackedChips = chips.slice(0, -1)

  return (
    <ButtonBase
      component="button"
      type="button"
      onClick={onClick}
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr',
          md: hasDateColumn
            ? 'minmax(0, 1fr) minmax(140px, 200px) auto minmax(140px, 190px)'
            : 'minmax(0, 1fr) minmax(140px, 200px) auto',
        },
        columnGap: 2,
        rowGap: 0.5,
        alignItems: 'center',
        width: '100%',
        minHeight: 52,
        px: 1.5,
        py: 0.5,
        borderRadius: 1,
        textAlign: 'left',
        opacity: isLocked ? 0.65 : 1,
        '&:hover': { backgroundColor: 'action.hover' },
        '&.Mui-focusVisible': {
          outline: '2px solid',
          outlineColor: 'primary.main',
          outlineOffset: -2,
        },
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Stack direction="row" spacing={0.75} alignItems="center">
          <Typography variant="body1" sx={{ fontWeight: 600, wordBreak: 'break-word' }}>
            {title}
          </Typography>
          {isLocked && (
            <LockIcon sx={{ fontSize: '1.1rem', color: 'text.secondary', flexShrink: 0 }} />
          )}
        </Stack>
        {description && (
          <Typography variant="body2" color="text.secondary" sx={{ display: 'block', wordBreak: 'break-word' }}>
            {description}
          </Typography>
        )}
      </Box>

      <Box sx={{ minWidth: 0, width: '100%' }}>
        {total > 0 ? (
          <Stack direction="row" spacing={1} alignItems="center">
            <LinearProgress
              variant="determinate"
              value={completionValue}
              aria-label={progressAriaLabel}
              sx={{
                flex: 1,
                height: 6,
                borderRadius: 999,
                bgcolor: 'action.hover',
                '& .MuiLinearProgress-bar': { borderRadius: 999 },
              }}
            />
            <Typography variant="body2" sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
              {completed}/{total}
            </Typography>
          </Stack>
        ) : (
          <Typography variant="body2" color="text.secondary">
            No questions
          </Typography>
        )}
      </Box>

      <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        {anchorChip &&
          (() => {
            const { label, ...chipProps } = anchorChip
            return <Chip label={label} size="small" {...chipProps} />
          })()}
        {stackedChips.length > 0 && (
          <Stack spacing={0.5} sx={{ position: 'absolute', left: 0, bottom: '100%', mb: 0.5 }}>
            {stackedChips.map(({ label, ...chipProps }) => (
              <Chip key={label} label={label} size="small" {...chipProps} />
            ))}
          </Stack>
        )}
      </Box>

      {hasDateColumn && (
        <Box sx={{ minWidth: 0, textAlign: { xs: 'left', md: 'right' } }}>
          {dateLabel && (
            <Typography variant="body2" color="text.secondary" sx={{ display: 'block' }}>
              {dateLabel}
            </Typography>
          )}
          {noteLines.map((line) => (
            <Typography key={line} variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              {line}
            </Typography>
          ))}
        </Box>
      )}
    </ButtonBase>
  )
}

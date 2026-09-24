import { Box, ButtonBase, Chip, LinearProgress, Stack, Typography } from '@mui/material'
import LockIcon from '@mui/icons-material/Lock'
import { Link as RouterLink } from 'react-router-dom'

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
  to,
  state,
}) {
  const total = Math.max(Number(totalQuestions) || 0, 0)
  const completed = Math.min(Math.max(Number(completedQuestions) || 0, 0), total)
  const completionValue = total > 0 ? (completed / total) * 100 : 0
  const hasDateColumn = Boolean(dateLabel) || noteLines.length > 0
  const statusChips = chips.length > 0
    ? chips
    : [{ label: completed > 0 ? 'In progress' : 'Not started', color: 'default' }]

  return (
    <ButtonBase
      component={to ? RouterLink : 'button'}
      to={to}
      state={to ? state : undefined}
      disabled={!to}
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: 'minmax(0, 1fr) 104px',
          lg: hasDateColumn
            ? 'minmax(0, 1fr) 240px 104px 200px'
            : 'minmax(0, 1fr) 240px 104px',
        },
        gridTemplateAreas: {
          xs: hasDateColumn ? '"title title" "progress status" "date date"' : '"title title" "progress status"',
          lg: hasDateColumn ? '"title progress status date"' : '"title progress status"',
        },
        columnGap: 2,
        rowGap: 1,
        alignItems: 'center',
        width: '100%',
        minHeight: 64,
        px: 2,
        py: 1.5,
        borderRadius: 0,
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
      <Box sx={{ minWidth: 0, gridArea: 'title' }}>
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

      <Box sx={{ minWidth: 0, width: '100%', gridArea: 'progress' }}>
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
            <Typography variant="body2" sx={{ fontWeight: 500, whiteSpace: 'nowrap', minWidth: '5ch', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
              {completed}/{total}
            </Typography>
          </Stack>
        ) : (
          <Typography variant="body2" color="text.secondary">
            No questions
          </Typography>
        )}
      </Box>

      <Box sx={{ gridArea: 'status', display: 'flex', flexWrap: 'wrap', gap: 0.5, minWidth: 0 }}>
        {statusChips.map(({ label, ...chipProps }) => (
          <Chip
            key={label}
            label={label}
            size="small"
            variant="filled"
            {...chipProps}
            sx={{ height: 'auto', minHeight: 24, maxWidth: '100%', '& .MuiChip-label': { whiteSpace: 'normal', py: 0.25 } }}
          />
        ))}
      </Box>

      {hasDateColumn && (
        <Box sx={{ minWidth: 0, gridArea: 'date', textAlign: { xs: 'left', lg: 'right' }, overflowWrap: 'anywhere' }}>
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

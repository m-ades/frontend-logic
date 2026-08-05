import { Box, Button, Divider, Stack, Typography } from '@mui/material'
import { Assignment as AssignmentIcon, MenuBook as BookIcon } from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { useAppRuntime } from '@/hooks/useAppRuntime.js'

/**
 * Right pane for the textbook split view: lists linked practices, or a quiet empty state.
 */
export default function AssignmentWorkspace({
  title = 'Assignment workspace',
  subtitle = 'Linked practice appears here when your instructor connects this chapter.',
  links = [],
  textbookSlug = null,
}) {
  const navigate = useNavigate()
  const { assignmentPath, practicePath, learnPath, learnChapterPath } = useAppRuntime()

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
        p: { xs: 2, md: 2.5 },
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ mb: 2 }}>
        <AssignmentIcon color="primary" aria-hidden />
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h6" component="h2" sx={{ fontSize: '1.25rem', lineHeight: 1.3 }}>
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.9375rem', mt: 0.5 }}>
            {subtitle}
          </Typography>
        </Box>
      </Stack>

      <Divider sx={{ mb: 2 }} />

      <Box sx={{ flexGrow: 1, minHeight: 0, overflow: 'auto' }}>
        {links.length === 0 ? (
          <Box
            sx={{
              border: '1px dashed',
              borderColor: 'divider',
              borderRadius: 1,
              p: 2.5,
              bgcolor: 'background.paper',
            }}
          >
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
              <BookIcon fontSize="small" color="action" aria-hidden />
              <Typography sx={{ fontSize: '1rem', fontWeight: 600 }}>
                No linked practice yet
              </Typography>
            </Stack>
            <Typography sx={{ fontSize: '0.9375rem', color: 'text.secondary', lineHeight: 1.6 }}>
              Instructors can connect forall x chapters to HuLA practice sets from
              <strong> Textbook</strong>. Until then, use this pane as reading
              space and browse chapters from Learn.
            </Typography>
            {(learnPath || practicePath) && (
              <Button
                sx={{ mt: 2 }}
                size="small"
                variant="outlined"
                onClick={() => navigate(learnPath || practicePath)}
              >
                Back to Learn
              </Button>
            )}
          </Box>
        ) : (
          <Stack spacing={1.5}>
            {links.map((link) => (
              <Box
                key={link.id}
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  p: 2,
                  bgcolor: 'background.paper',
                }}
              >
                <Typography sx={{ fontSize: '1.0625rem', fontWeight: 600, mb: 0.5 }}>
                  {link.practiceTitle}
                </Typography>
                <Typography sx={{ fontSize: '0.875rem', color: 'text.secondary', mb: 1.5 }}>
                  {link.practiceChapter != null
                    ? `Course chapter ${link.practiceChapter}${
                        link.practiceSubchapter ? ` · ${link.practiceSubchapter}` : ''
                      }`
                    : 'Practice assignment'}
                  {link.sectionId ? ` · textbook § ${link.sectionId}` : ''}
                </Typography>
                <Button
                  variant="contained"
                  size="small"
                  onClick={() => {
                    const path =
                      assignmentPath?.(link.practiceId) ||
                      `/student/assignment/${link.practiceId}`
                    navigate(path, {
                      state: {
                        returnTo:
                          (textbookSlug && learnChapterPath?.(textbookSlug)) ||
                          learnPath ||
                          practicePath ||
                          '/student/learn',
                        textbookSlug: textbookSlug || link.textbookSlug,
                        textbookSectionId: link.sectionId || undefined,
                      },
                    })
                  }}
                >
                  Open in workspace
                </Button>
              </Box>
            ))}
          </Stack>
        )}
      </Box>
    </Box>
  )
}

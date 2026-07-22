import { useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  RestartAlt as ResetIcon,
} from '@mui/icons-material'
import { useAppRuntime } from '@/hooks/useAppRuntime.js'
import { useTextbookPracticeLinks } from '@/hooks/useTextbookPracticeLinks.js'
import { listTextbookNavItems } from '@/components/textbook/textbookCatalog.js'
import { createLinkId, normalizeLink } from '@/components/textbook/textbookPracticeLinks.js'
import ThemedCard from '@/components/ui/ThemedCard.jsx'

const emptyForm = {
  textbookSlug: 'Ch1',
  sectionId: '',
  practiceId: '',
  label: '',
}

/**
 * Instructor UI to link forall x chapters to course practice assignments.
 * Persists per-course overrides (localStorage live / sessionStorage sandbox).
 */
export default function InstructorTextbookLinks() {
  const { courseState } = useAppRuntime()
  const { courses, activeCourseId } = courseState || {}
  const activeCourse = courses?.find((course) => course.id === activeCourseId)

  const {
    definitions,
    resolvedLinks,
    practices,
    saveLinks,
    resetToDefaults,
  } = useTextbookPracticeLinks()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [savedFlash, setSavedFlash] = useState(false)

  const chapters = useMemo(() => listTextbookNavItems(), [])

  const flashSaved = () => {
    setSavedFlash(true)
    window.setTimeout(() => setSavedFlash(false), 2500)
  }

  const openCreate = () => {
    setForm({
      ...emptyForm,
      practiceId: practices[0] ? String(practices[0].id) : '',
    })
    setError('')
    setDialogOpen(true)
  }

  const handleSaveLink = () => {
    if (!form.textbookSlug) {
      setError('Choose a textbook chapter.')
      return
    }
    if (!form.practiceId) {
      setError('Choose a practice assignment.')
      return
    }

    const practice = practices.find((item) => String(item.id) === String(form.practiceId))
    const next = [
      ...definitions.map(normalizeLink),
      normalizeLink({
        id: createLinkId(),
        textbookSlug: form.textbookSlug,
        sectionId: form.sectionId.trim() || null,
        practiceId: form.practiceId,
        label: form.label.trim() || practice?.title || practice?.name || null,
        match: practice
          ? { chapter: practice.chapter, subchapter: practice.subchapter }
          : null,
      }),
    ]

    saveLinks(next)
    setDialogOpen(false)
    flashSaved()
  }

  const handleDelete = (linkId) => {
    const next = definitions.filter((link) => link.id !== linkId)
    // Saving an empty array still counts as an override (intentional clear).
    saveLinks(next)
    flashSaved()
  }

  const handleReset = () => {
    resetToDefaults()
    flashSaved()
  }

  if (!activeCourse) {
    return (
      <Box>
        <Typography variant="h4" component="h1" sx={{ mb: 3, fontWeight: 600 }}>
          Textbook Links
        </Typography>
        <Alert severity="info">No course selected</Alert>
      </Box>
    )
  }

  return (
    <Box>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        alignItems={{ xs: 'stretch', sm: 'center' }}
        justifyContent="space-between"
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
            Textbook Links
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Connect forall x: Calgary chapters to practice sets. Linked chapters show
            practice widgets while reading; linked practices open with the textbook beside them.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Tooltip title="Restore HuLA starter links for this course">
            <Button
              variant="outlined"
              startIcon={<ResetIcon />}
              onClick={handleReset}
              aria-label="Reset textbook links to defaults"
            >
              Reset defaults
            </Button>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={openCreate}
            disabled={!practices.length}
            aria-label="Add textbook practice link"
          >
            Add link
          </Button>
        </Stack>
      </Stack>

      {savedFlash && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Textbook links saved for this course.
        </Alert>
      )}

      {!practices.length && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          This course has no practice assignments yet. Create practices first, then link them here.
        </Alert>
      )}

      <ThemedCard>
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small" aria-label="Textbook practice links">
            <TableHead>
              <TableRow>
                <TableCell>Textbook</TableCell>
                <TableCell>Section</TableCell>
                <TableCell>Practice</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {definitions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5}>
                    <Typography color="text.secondary" sx={{ py: 2 }}>
                      No links configured.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                definitions.map((link) => {
                  const resolved = resolvedLinks.find((item) => item.id === link.id)
                  const practice =
                    practices.find((item) => String(item.id) === String(link.practiceId)) ||
                    (link.match
                      ? practices.find(
                          (item) =>
                            Number(item.chapter) === Number(link.match.chapter) &&
                            (!link.match.subchapter ||
                              String(item.subchapter) === String(link.match.subchapter)),
                        )
                      : null)

                  return (
                    <TableRow key={link.id} hover>
                      <TableCell>
                        <Typography fontWeight={600}>{link.textbookSlug}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {chapters.find((item) => item.slug === link.textbookSlug)?.label || ''}
                        </Typography>
                      </TableCell>
                      <TableCell>{link.sectionId || '—'}</TableCell>
                      <TableCell>
                        {practice ? (
                          <>
                            <Typography>{practice.title || practice.name}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              Ch {practice.chapter}
                              {practice.subchapter ? ` · ${practice.subchapter}` : ''}
                            </Typography>
                          </>
                        ) : (
                          <Typography color="warning.main">
                            Unresolved
                            {link.match
                              ? ` (looking for ch ${link.match.chapter}${
                                  link.match.subchapter ? ` / ${link.match.subchapter}` : ''
                                })`
                              : ''}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        {resolved ? (
                          <Typography color="success.main" variant="body2">
                            Active
                          </Typography>
                        ) : (
                          <Typography color="text.secondary" variant="body2">
                            Inactive
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          aria-label={`Delete link for ${link.textbookSlug}`}
                          onClick={() => handleDelete(link.id)}
                          sx={{
                            '&:focus-visible': {
                              outline: '2px solid',
                              outlineColor: 'primary.main',
                              outlineOffset: 2,
                            },
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </Box>
      </ThemedCard>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        fullWidth
        maxWidth="sm"
        aria-labelledby="textbook-link-dialog-title"
      >
        <DialogTitle id="textbook-link-dialog-title">Add textbook link</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <FormControl fullWidth>
              <InputLabel id="link-chapter-label">Textbook chapter</InputLabel>
              <Select
                labelId="link-chapter-label"
                label="Textbook chapter"
                value={form.textbookSlug}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, textbookSlug: event.target.value }))
                }
              >
                {chapters.map((chapter) => (
                  <MenuItem key={chapter.slug} value={chapter.slug}>
                    {chapter.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Section id (optional)"
              value={form.sectionId}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, sectionId: event.target.value }))
              }
              helperText="LaTeXML anchor such as Sx1 or S1 — used to scroll the textbook pane"
              fullWidth
            />

            <FormControl fullWidth>
              <InputLabel id="link-practice-label">Practice assignment</InputLabel>
              <Select
                labelId="link-practice-label"
                label="Practice assignment"
                value={form.practiceId}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, practiceId: event.target.value }))
                }
              >
                {practices.map((practice) => (
                  <MenuItem key={practice.id} value={String(practice.id)}>
                    {practice.title || practice.name}
                    {practice.chapter != null
                      ? ` (Ch ${practice.chapter}${
                          practice.subchapter ? ` · ${practice.subchapter}` : ''
                        })`
                      : ''}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Display label (optional)"
              value={form.label}
              onChange={(event) => setForm((prev) => ({ ...prev, label: event.target.value }))}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveLink}>
            Save link
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

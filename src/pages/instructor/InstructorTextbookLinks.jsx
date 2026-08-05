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
  Tab,
  Tabs,
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
  Sync as SyncIcon,
} from '@mui/icons-material'
import { useAppRuntime } from '@/hooks/useAppRuntime.js'
import { useTextbookPracticeLinks } from '@/hooks/useTextbookPracticeLinks.js'
import { useTextbookStructure } from '@/hooks/useTextbookStructure.js'
import { createLinkId, normalizeLink } from '@/components/textbook/textbookPracticeLinks.js'
import TextbookStructureEditor from '@/components/textbook/TextbookStructureEditor.jsx'
import ThemedCard from '@/components/ui/ThemedCard.jsx'

const emptyForm = {
  textbookSlug: 'Ch1',
  sectionId: '',
  practiceId: '',
  label: '',
}

function PracticeLinksPanel({ chapters }) {
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

  const flashSaved = () => {
    setSavedFlash(true)
    window.setTimeout(() => setSavedFlash(false), 2500)
  }

  const openCreate = () => {
    setForm({
      ...emptyForm,
      textbookSlug: chapters[0]?.slug || 'Ch1',
      practiceId: practices[0] ? String(practices[0].id) : '',
    })
    setError('')
    setDialogOpen(true)
  }

  const handleSaveLink = async () => {
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

    try {
      await saveLinks(next)
      setDialogOpen(false)
      flashSaved()
    } catch (err) {
      setError(err?.message || 'Failed to save link.')
    }
  }

  const handleDelete = async (linkId) => {
    const next = definitions.filter((link) => link.id !== linkId)
    try {
      await saveLinks(next)
      flashSaved()
    } catch (err) {
      setError(err?.message || 'Failed to delete link.')
    }
  }

  const handleReset = async () => {
    try {
      await resetToDefaults()
      flashSaved()
    } catch (err) {
      setError(err?.message || 'Failed to reset links.')
    }
  }

  return (
    <Box>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        alignItems={{ xs: 'stretch', sm: 'center' }}
        justifyContent="space-between"
        sx={{ mb: 2 }}
      >
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 40 * 16 }}>
          Links stay keyed by file slug, so reordering or renaming display titles in Structure
          does not break practice coupling.
        </Typography>
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
                  const chapter = chapters.find((item) => item.slug === link.textbookSlug)

                  return (
                    <TableRow key={link.id} hover>
                      <TableCell>
                        <Typography fontWeight={600}>{link.textbookSlug}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {chapter?.label || ''}
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

/**
 * Instructor Textbook management — structure editor + practice links.
 * Route: `/instructor/textbook-links`
 */
export default function InstructorTextbookLinks() {
  const { courseState } = useAppRuntime()
  const { courses, activeCourseId } = courseState || {}
  const activeCourse = courses?.find((course) => course.id === activeCourseId)

  const {
    nodes,
    numberedFlat,
    hasOverrides,
    saveStructure,
    resetToBundle,
    syncFiles,
  } = useTextbookStructure()

  const [tab, setTab] = useState(0)
  const [flash, setFlash] = useState(null)

  const chapters = useMemo(
    () => numberedFlat.map((node) => ({ slug: node.slug, label: node.label || node.displayTitle })),
    [numberedFlat],
  )

  const showFlash = (message, severity = 'success') => {
    setFlash({ message, severity })
    window.setTimeout(() => setFlash(null), 3500)
  }

  const handleSync = async () => {
    try {
      const { added, missing } = await syncFiles()
      const parts = []
      if (added.length) parts.push(`added ${added.length}`)
      if (missing.length) parts.push(`${missing.length} missing from bundle (removed from structure)`)
      showFlash(
        parts.length
          ? `Synced from bundle (${parts.join('; ')}).`
          : 'Synced from bundle — structure already matches inventory.',
      )
    } catch (error) {
      showFlash(error?.message || 'Failed to sync structure.', 'error')
    }
  }

  const handleResetStructure = async () => {
    try {
      await resetToBundle()
      showFlash('Structure reset to BookML bundle defaults.')
    } catch (error) {
      showFlash(error?.message || 'Failed to reset structure.', 'error')
    }
  }

  if (!activeCourse) {
    return (
      <Box>
        <Typography variant="h4" component="h1" sx={{ mb: 3, fontWeight: 600 }}>
          Textbook
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
        alignItems={{ xs: 'stretch', sm: 'flex-start' }}
        justifyContent="space-between"
        sx={{ mb: 2 }}
      >
        <Box>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
            Textbook
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: 44 * 16 }}>
            Manage forall x: Calgary order and display titles for this course, then link chapters
            to practice. Numbers are computed from order; file slugs stay fixed.
          </Typography>
        </Box>
      </Stack>

      {flash && (
        <Alert severity={flash.severity} sx={{ mb: 2 }}>
          {flash.message}
        </Alert>
      )}

      <Tabs
        value={tab}
        onChange={(_event, value) => setTab(value)}
        aria-label="Textbook management tabs"
        sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab label="Structure" id="textbook-tab-structure" aria-controls="textbook-panel-structure" />
        <Tab
          label="Practice links"
          id="textbook-tab-links"
          aria-controls="textbook-panel-links"
        />
      </Tabs>

      {tab === 0 && (
        <Box
          role="tabpanel"
          id="textbook-panel-structure"
          aria-labelledby="textbook-tab-structure"
        >
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            alignItems={{ xs: 'stretch', sm: 'center' }}
            justifyContent="space-between"
            sx={{ mb: 2 }}
          >
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 42 * 16 }}>
              Drag to reorder. Drop a chapter onto a part to nest it. After replacing HTML in{' '}
              <code>public/textbook/</code>, regenerate inventory (
              <code>node scripts/generate-textbook-inventory.mjs</code>) then Sync from bundle.
              {hasOverrides ? ' Custom order saved for this course.' : ' Using bundle defaults.'}
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Button
                variant="outlined"
                startIcon={<SyncIcon />}
                onClick={handleSync}
                aria-label="Sync textbook structure from bundle inventory"
              >
                Sync from bundle
              </Button>
              <Tooltip title="Clear course overrides and restore seeded TOC">
                <Button
                  variant="outlined"
                  startIcon={<ResetIcon />}
                  onClick={handleResetStructure}
                  aria-label="Reset structure to bundle defaults"
                >
                  Reset to bundle
                </Button>
              </Tooltip>
            </Stack>
          </Stack>

          <TextbookStructureEditor nodes={nodes} onChange={saveStructure} />
        </Box>
      )}

      {tab === 1 && (
        <Box role="tabpanel" id="textbook-panel-links" aria-labelledby="textbook-tab-links">
          <PracticeLinksPanel chapters={chapters} />
        </Box>
      )}
    </Box>
  )
}

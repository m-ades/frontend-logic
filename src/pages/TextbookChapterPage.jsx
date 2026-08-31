import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Box,
  Button,
  IconButton,
  Stack,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import {
  ArrowBack as BackIcon,
  ChevronLeft as PrevIcon,
  ChevronRight as NextIcon,
  Menu as MenuIcon,
} from '@mui/icons-material'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import SplitViewLayout from '@/components/layout/SplitViewLayout.jsx'
import ResizableRail from '@/components/layout/ResizableRail.jsx'
import TextbookReader from '@/components/textbook/TextbookReader.jsx'
import TextbookTocNav from '@/components/textbook/TextbookTocNav.jsx'
import EmbeddedPracticePane from '@/components/textbook/EmbeddedPracticePane.jsx'
import {
  getTextbookEntry,
  normalizeTextbookSlug,
} from '@/components/textbook/textbookCatalog.js'
import { useAppRuntime } from '@/hooks/useAppRuntime.js'
import { useTextbookPracticeLinks } from '@/hooks/useTextbookPracticeLinks.js'
import { useTextbookStructure } from '@/hooks/useTextbookStructure.js'
import { linksForTextbookSlug } from '@/components/textbook/textbookPracticeLinks.js'

// textbook chapter reader with linked practice
export default function TextbookChapterPage({
  previewChapter = null,
  onOpenChapter = null,
  onOpenHub = null,
}) {
  const { chapter: routeChapter } = useParams()
  const chapter = previewChapter || routeChapter
  const location = useLocation()
  const navigate = useNavigate()
  const theme = useTheme()
  const isMdUp = useMediaQuery(theme.breakpoints.up('md'))

  const { textbookPath, textbookChapterPath } = useAppRuntime()
  const slug = normalizeTextbookSlug(chapter)
  const entry = getTextbookEntry(slug)
  const { getNeighbors, studentFlat, numberedTree, resolveSlug, nodes } = useTextbookStructure()

  // Part / section dividers are not readable pages — bounce to first chapter or hub.
  useEffect(() => {
    const target = resolveSlug(slug)
    if (target === slug) return
    if (target) {
      if (onOpenChapter) {
        onOpenChapter(target)
        return
      }
      const path = textbookChapterPath?.(target) || `${textbookPath || '/student/textbook'}/${target}`
      navigate(path, { replace: true })
      return
    }
    // Known divider with no children, or empty resolve → hub
    const node = nodes.find((item) => item.slug === slug)
    if (node && node.navigable === false) {
      if (onOpenHub) {
        onOpenHub()
        return
      }
      navigate(textbookPath || '/student/textbook', { replace: true })
    }
  }, [
    slug,
    resolveSlug,
    nodes,
    navigate,
    textbookChapterPath,
    textbookPath,
    onOpenChapter,
    onOpenHub,
  ])

  const neighbors = useMemo(() => getNeighbors(slug), [getNeighbors, slug])
  const prev = neighbors.prev
  const next = neighbors.next
  const structureEntry = useMemo(
    () => studentFlat.find((node) => node.slug === slug) || neighbors.entry,
    [studentFlat, slug, neighbors.entry],
  )
  const structureTitle = structureEntry?.label || structureEntry?.displayTitle || ''
  const [pageTitle, setPageTitle] = useState(structureTitle || entry?.pageTitle || entry?.title || '')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [tocCollapsed, setTocCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false
    try {
      return window.localStorage.getItem('hula_textbook_toc_width_collapsed') === 'true'
    } catch {
      return false
    }
  })
  const [activePracticeId, setActivePracticeId] = useState(null)

  const { resolvedLinks } = useTextbookPracticeLinks()
  const chapterLinks = useMemo(
    () => linksForTextbookSlug(resolvedLinks, slug),
    [resolvedLinks, slug],
  )
  const firstPracticeId = chapterLinks[0]?.practiceId ?? null
  const chapterPracticeIdsKey = JSON.stringify(chapterLinks.map((link) => link.practiceId))
  const linkedSlugs = useMemo(
    () => [...new Set(resolvedLinks.map((link) => link.textbookSlug))],
    [resolvedLinks],
  )

  // Prefer HuLA structure titles in chrome; fall back to BookML page title.
  useEffect(() => {
    setPageTitle(structureTitle || entry?.pageTitle || entry?.title || slug)
  }, [slug, structureTitle, entry])

  useEffect(() => {
    setActivePracticeId(firstPracticeId)
  }, [slug, chapterPracticeIdsKey, firstPracticeId])

  const linkBase = useMemo(() => {
    if (textbookChapterPath) {
      return textbookChapterPath('').replace(/\/$/, '')
    }
    if (location.pathname.startsWith('/sandbox/student')) {
      return '/sandbox/student/textbook'
    }
    return '/student/textbook'
  }, [textbookChapterPath, location.pathname])

  const hubPath = textbookPath || linkBase

  const goChapter = useCallback(
    (targetSlug) => {
      if (!targetSlug) return
      const resolved = resolveSlug(targetSlug) || targetSlug
      if (onOpenChapter) {
        onOpenChapter(resolved)
        return
      }
      navigate(`${linkBase}/${resolved}`)
    },
    [navigate, linkBase, resolveSlug, onOpenChapter],
  )

  const goHub = useCallback(() => {
    if (onOpenHub) {
      onOpenHub()
      return
    }
    navigate(hubPath)
  }, [hubPath, navigate, onOpenHub])

  const handleMetaChange = useCallback((meta) => {
    if (meta?.title) setPageTitle(meta.title)
  }, [])

  const hasPractice = chapterLinks.length > 0
  const displayTitle = structureTitle || pageTitle || entry?.pageTitle || entry?.title || slug
  const prevLabel = prev?.label || prev?.displayTitle || prev?.pageTitle || prev?.title
  const nextLabel = next?.label || next?.displayTitle || next?.pageTitle || next?.title

  // Practice is already in the right pane — don't duplicate CTAs inside the reader.
  const reader = (
    <TextbookReader
      slug={slug}
      linkBase={linkBase}
      linkedPractices={[]}
      onMetaChange={handleMetaChange}
      onChapterNavigate={(targetSlug) => {
        if (targetSlug) goChapter(targetSlug)
        else goHub()
      }}
      resolveInternalSlug={resolveSlug}
    />
  )

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: { xs: 'auto', md: '100%' },
        minHeight: { xs: '70vh', md: 0 },
        gap: 1,
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        spacing={0.75}
        sx={{ flexShrink: 0, flexWrap: 'wrap', gap: 0.5 }}
      >
        <Tooltip title="Back to Textbook">
          <IconButton
            size="small"
            onClick={goHub}
            aria-label="Back to Textbook table of contents"
            sx={{
              '&:focus-visible': {
                outline: '2px solid',
                outlineColor: 'primary.main',
                outlineOffset: 2,
              },
            }}
          >
            <BackIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        {!isMdUp ? (
          <Button
            size="small"
            startIcon={<MenuIcon />}
            onClick={() => setDrawerOpen(true)}
            aria-label="Open table of contents"
            sx={{
              textTransform: 'none',
              '&:focus-visible': {
                outline: '2px solid',
                outlineColor: 'primary.main',
                outlineOffset: 2,
              },
            }}
          >
            Contents
          </Button>
        ) : (
          <Button
            size="small"
            startIcon={<MenuIcon />}
            onClick={() => setTocCollapsed((prev) => !prev)}
            aria-label={tocCollapsed ? 'Expand table of contents' : 'Collapse table of contents'}
            aria-pressed={!tocCollapsed}
            sx={{
              textTransform: 'none',
              '&:focus-visible': {
                outline: '2px solid',
                outlineColor: 'primary.main',
                outlineOffset: 2,
              },
            }}
          >
            Contents
          </Button>
        )}

        <Tooltip title={prev ? `Previous: ${prevLabel}` : 'No previous chapter'}>
          <span>
            <IconButton
              size="small"
              disabled={!prev}
              onClick={() => goChapter(prev?.slug)}
              aria-label={
                prev ? `Previous chapter: ${prevLabel}` : 'No previous chapter'
              }
              sx={{
                '&:focus-visible': {
                  outline: '2px solid',
                  outlineColor: 'primary.main',
                  outlineOffset: 2,
                },
              }}
            >
              <PrevIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>

        <Typography
          component="h1"
          sx={{
            fontSize: '1.0625rem',
            fontWeight: 600,
            lineHeight: 1.3,
            flexGrow: 1,
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            px: 0.5,
          }}
          title={displayTitle}
        >
          {displayTitle}
        </Typography>

        <Tooltip title={next ? `Next: ${nextLabel}` : 'No next chapter'}>
          <span>
            <IconButton
              size="small"
              disabled={!next}
              onClick={() => goChapter(next?.slug)}
              aria-label={
                next ? `Next chapter: ${nextLabel}` : 'No next chapter'
              }
              sx={{
                '&:focus-visible': {
                  outline: '2px solid',
                  outlineColor: 'primary.main',
                  outlineOffset: 2,
                },
              }}
            >
              <NextIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>

      <TextbookTocNav
        tree={numberedTree}
        variant="drawer"
        drawerOpen={drawerOpen}
        onDrawerClose={() => setDrawerOpen(false)}
        activeSlug={slug}
        onSelect={goChapter}
        linkedSlugs={linkedSlugs}
      />

      <Box
        sx={{
          flexGrow: 1,
          minHeight: { xs: '28rem', md: 0 },
          display: 'flex',
          border: 1,
          borderColor: 'divider',
          borderRadius: 1,
          overflow: 'hidden',
          bgcolor: 'background.paper',
        }}
      >
        {isMdUp && (
          <ResizableRail
            storageKey="hula_textbook_toc_width"
            collapsible
            collapsed={tocCollapsed}
            onCollapsedChange={setTocCollapsed}
          >
            <TextbookTocNav
              tree={numberedTree}
              variant="rail"
              activeSlug={slug}
              onSelect={goChapter}
              linkedSlugs={linkedSlugs}
            />
          </ResizableRail>
        )}

        <Box sx={{ flexGrow: 1, minWidth: 0, minHeight: 0 }}>
          {hasPractice ? (
            <SplitViewLayout
              leftLabel="Textbook"
              rightLabel="Practice"
              left={reader}
              right={
                <EmbeddedPracticePane
                  links={chapterLinks}
                  activePracticeId={activePracticeId}
                  onPracticeChange={setActivePracticeId}
                />
              }
            />
          ) : (
            reader
          )}
        </Box>
      </Box>
    </Box>
  )
}

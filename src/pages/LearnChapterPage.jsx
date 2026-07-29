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
  getTextbookNeighbors,
  normalizeTextbookSlug,
} from '@/components/textbook/textbookCatalog.js'
import { useAppRuntime } from '@/hooks/useAppRuntime.js'
import { useTextbookPracticeLinks } from '@/hooks/useTextbookPracticeLinks.js'
import { linksForTextbookSlug } from '@/components/textbook/textbookPracticeLinks.js'

/**
 * Learn chapter — hierarchical TOC + reader; split embeds practice when linked.
 * Route: `/student/learn/:chapter`
 */
export default function LearnChapterPage() {
  const { chapter } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const theme = useTheme()
  const isMdUp = useMediaQuery(theme.breakpoints.up('md'))

  const { learnPath, learnChapterPath } = useAppRuntime()
  const slug = normalizeTextbookSlug(chapter)
  const entry = getTextbookEntry(slug)
  const { prev, next } = getTextbookNeighbors(slug)
  const [pageTitle, setPageTitle] = useState(entry?.pageTitle || entry?.title || '')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [activePracticeId, setActivePracticeId] = useState(null)

  const { resolvedLinks } = useTextbookPracticeLinks()
  const chapterLinks = useMemo(
    () => linksForTextbookSlug(resolvedLinks, slug),
    [resolvedLinks, slug],
  )
  const linkedSlugs = useMemo(
    () => [...new Set(resolvedLinks.map((link) => link.textbookSlug))],
    [resolvedLinks],
  )

  // Reset selected practice when chapter (or its links) change
  useEffect(() => {
    setActivePracticeId(chapterLinks[0]?.practiceId ?? null)
  }, [slug, chapterLinks])

  const linkBase = useMemo(() => {
    if (learnChapterPath) {
      return learnChapterPath('').replace(/\/$/, '')
    }
    if (location.pathname.startsWith('/sandbox/student')) {
      return '/sandbox/student/learn'
    }
    return '/student/learn'
  }, [learnChapterPath, location.pathname])

  const hubPath = learnPath || linkBase

  const goChapter = useCallback(
    (targetSlug) => {
      if (!targetSlug) return
      navigate(`${linkBase}/${targetSlug}`)
    },
    [navigate, linkBase],
  )

  const handleMetaChange = useCallback((meta) => {
    if (meta?.title) setPageTitle(meta.title)
  }, [])

  const hasPractice = chapterLinks.length > 0
  const displayTitle = pageTitle || entry?.pageTitle || entry?.title || slug

  // Practice is already in the right pane — don't duplicate CTAs inside the reader.
  const reader = (
    <TextbookReader
      slug={slug}
      linkBase={linkBase}
      linkedPractices={[]}
      onMetaChange={handleMetaChange}
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
        <Tooltip title="Back to Learn">
          <IconButton
            size="small"
            onClick={() => navigate(hubPath)}
            aria-label="Back to Learn table of contents"
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

        {!isMdUp && (
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
        )}

        <Tooltip title={prev ? `Previous: ${prev.pageTitle || prev.title}` : 'No previous chapter'}>
          <span>
            <IconButton
              size="small"
              disabled={!prev}
              onClick={() => goChapter(prev?.slug)}
              aria-label={
                prev
                  ? `Previous chapter: ${prev.pageTitle || prev.title}`
                  : 'No previous chapter'
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

        <Tooltip title={next ? `Next: ${next.pageTitle || next.title}` : 'No next chapter'}>
          <span>
            <IconButton
              size="small"
              disabled={!next}
              onClick={() => goChapter(next?.slug)}
              aria-label={
                next ? `Next chapter: ${next.pageTitle || next.title}` : 'No next chapter'
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
          <ResizableRail storageKey="hula_learn_toc_width">
            <TextbookTocNav
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

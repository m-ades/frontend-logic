import { useCallback, useMemo, useState } from 'react'
import { Box, Typography } from '@mui/material'
import { useLocation, useParams } from 'react-router-dom'
import SplitViewLayout from '@/components/layout/SplitViewLayout.jsx'
import TextbookReader from '@/components/textbook/TextbookReader.jsx'
import TextbookChapterNav from '@/components/textbook/TextbookChapterNav.jsx'
import AssignmentWorkspace from '@/components/textbook/AssignmentWorkspace.jsx'
import {
  getTextbookEntry,
  normalizeTextbookSlug,
} from '@/components/textbook/textbookCatalog.js'
import { useTextbookPracticeLinks } from '@/hooks/useTextbookPracticeLinks.js'
import { linksForTextbookSlug } from '@/components/textbook/textbookPracticeLinks.js'

/**
 * Student textbook + linked practice split view.
 * Route: `/student/textbook/:chapter` (BookML slug, e.g. Ch1).
 */
export default function TextbookPage() {
  const { chapter } = useParams()
  const location = useLocation()
  const slug = normalizeTextbookSlug(chapter)
  const entry = getTextbookEntry(slug)
  const [pageTitle, setPageTitle] = useState(entry?.pageTitle || entry?.title || '')
  const { resolvedLinks } = useTextbookPracticeLinks()

  const chapterLinks = useMemo(
    () => linksForTextbookSlug(resolvedLinks, slug),
    [resolvedLinks, slug],
  )

  const linkBase = useMemo(() => {
    if (location.pathname.startsWith('/sandbox/student')) {
      return '/sandbox/student/textbook'
    }
    return '/student/textbook'
  }, [location.pathname])

  const handleMetaChange = useCallback((meta) => {
    if (meta?.title) setPageTitle(meta.title)
  }, [])

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: { xs: 'auto', md: '100%' },
        minHeight: { xs: '70vh', md: 0 },
        gap: 1.5,
      }}
    >
      <Box sx={{ flexShrink: 0 }}>
        <Typography variant="h4" component="h1" sx={{ fontSize: '1.5rem', mb: 0.75 }}>
          forall x: Calgary
        </Typography>
        <TextbookChapterNav slug={slug} linkBase={linkBase} title={pageTitle} />
      </Box>

      <Box sx={{ flexGrow: 1, minHeight: { xs: '28rem', md: 0 } }}>
        <SplitViewLayout
          leftLabel="Textbook"
          rightLabel="Practice"
          left={
            <TextbookReader
              slug={slug}
              linkBase={linkBase}
              linkedPractices={chapterLinks}
              onMetaChange={handleMetaChange}
            />
          }
          right={
            <AssignmentWorkspace
              title={chapterLinks.length ? 'Linked practice' : 'Practice'}
              subtitle={
                chapterLinks.length
                  ? 'Open a linked set while you read — or keep the textbook beside your worksheet.'
                  : 'No practice is linked to this chapter yet.'
              }
              links={chapterLinks}
              textbookSlug={slug}
            />
          }
        />
      </Box>
    </Box>
  )
}

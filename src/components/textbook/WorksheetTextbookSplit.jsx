import { Box } from '@mui/material'
import { useLocation } from 'react-router-dom'
import SplitViewLayout from '@/components/layout/SplitViewLayout.jsx'
import TextbookReader from '@/components/textbook/TextbookReader.jsx'
import { useAppRuntime } from '@/hooks/useAppRuntime.js'
import { useTextbookPracticeLinks } from '@/hooks/useTextbookPracticeLinks.js'
import { useTextbookStructure } from '@/hooks/useTextbookStructure.js'
import {
  linksForPracticeId,
  primarySectionIdForPractice,
  primaryTextbookSlugForPractice,
} from '@/components/textbook/textbookPracticeLinks.js'

/**
 * Wraps a practice worksheet with the linked textbook chapter in a split view.
 * If no textbook link resolves, renders children alone (homework unchanged).
 */
export default function WorksheetTextbookSplit({
  practiceId,
  activityKind,
  children,
}) {
  const location = useLocation()
  const { routePrefix, textbookChapterPath } = useAppRuntime()
  const { resolvedLinks } = useTextbookPracticeLinks()
  const { resolveSlug } = useTextbookStructure()

  const practiceLinks = linksForPracticeId(resolvedLinks, practiceId)
  const isPractice =
    String(activityKind || '').toLowerCase() === 'practice' || practiceLinks.length > 0

  const linkedSlug =
    location.state?.textbookSlug || primaryTextbookSlugForPractice(resolvedLinks, practiceId)
  const sectionId =
    location.state?.textbookSectionId ||
    primarySectionIdForPractice(resolvedLinks, practiceId)

  if (!isPractice || !linkedSlug) {
    return children
  }

  const linkBase = textbookChapterPath
    ? textbookChapterPath('').replace(/\/$/, '')
    : `${routePrefix || '/student'}/textbook`
  const chapterLinks = practiceLinks.filter((link) => link.textbookSlug === linkedSlug)

  return (
    <Box
      sx={{
        height: { xs: 'auto', md: '100%' },
        minHeight: { xs: '70vh', md: 0 },
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <SplitViewLayout
        leftLabel="Textbook"
        rightLabel="Practice"
        defaultLeftPercent={42}
        left={
          <TextbookReader
            slug={linkedSlug}
            linkBase={linkBase}
            linkedPractices={chapterLinks}
            scrollToId={sectionId}
            resolveInternalSlug={resolveSlug}
          />
        }
        right={
          <Box sx={{ height: '100%', minHeight: 0, overflow: 'auto', p: { xs: 1, md: 1.5 } }}>
            {children}
          </Box>
        }
      />
    </Box>
  )
}

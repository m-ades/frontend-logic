import { useCallback, useEffect, useState } from 'react'
import { Box } from '@mui/material'
import { useLocation } from 'react-router-dom'
import SplitViewLayout from '@/components/layout/SplitViewLayout.jsx'
import TextbookReader from '@/components/textbook/TextbookReader.jsx'
import TextbookHubPage from '@/pages/TextbookHubPage.jsx'
import { useAppRuntime } from '@/hooks/useAppRuntime.js'
import { useTextbookPracticeLinks } from '@/hooks/useTextbookPracticeLinks.js'
import { useTextbookStructure } from '@/hooks/useTextbookStructure.js'
import { linksForPracticeId } from '@/components/textbook/textbookPracticeLinks.js'
import { isTextbookAvailable } from '@/components/textbook/textbookAvailability.js'

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
  const { routePrefix, textbookChapterPath, courseState } = useAppRuntime()
  const { resolvedLinks } = useTextbookPracticeLinks()
  const { resolveSlug } = useTextbookStructure()

  const practiceLinks = linksForPracticeId(resolvedLinks, practiceId)
  const activeCourse = courseState?.courses?.find(
    (course) => String(course.id) === String(courseState.activeCourseId),
  )
  const textbookAvailable = isTextbookAvailable(
    activeCourse?.logicSystem ?? activeCourse?.logic_system,
  )
  const isPractice = String(activityKind || '').toLowerCase() === 'practice'

  const linkedSlug = location.state?.textbookSlug || practiceLinks[0]?.textbookSlug || null
  const linkedPractice = practiceLinks.find((link) => link.textbookSlug === linkedSlug)
  const sectionId = location.state?.textbookSectionId || linkedPractice?.sectionId || null
  const [openChapter, setOpenChapter] = useState(linkedSlug)

  useEffect(() => {
    setOpenChapter(linkedSlug)
  }, [linkedSlug])

  const openHub = useCallback(() => setOpenChapter(null), [])
  const handleChapterNavigate = useCallback((targetSlug) => {
    if (targetSlug) {
      setOpenChapter(targetSlug)
      return
    }
    openHub()
  }, [openHub])

  if (!textbookAvailable || !isPractice || !linkedSlug) {
    return children
  }

  const linkBase = textbookChapterPath
    ? textbookChapterPath('').replace(/\/$/, '')
    : `${routePrefix || '/student'}/textbook`
  const chapterLinks = practiceLinks.filter((link) => link.textbookSlug === openChapter)

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
          openChapter ? (
            <TextbookReader
              slug={openChapter}
              linkBase={linkBase}
              linkedPractices={chapterLinks}
              scrollToId={openChapter === linkedSlug ? sectionId : null}
              onChapterNavigate={handleChapterNavigate}
              resolveInternalSlug={resolveSlug}
            />
          ) : (
            <Box sx={{ height: '100%', overflow: 'auto', p: 2 }}>
              <TextbookHubPage onOpenChapter={setOpenChapter} />
            </Box>
          )
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

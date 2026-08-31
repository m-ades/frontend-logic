import { Box, Typography } from '@mui/material'
import PracticeWidget from '@/components/textbook/PracticeWidget.jsx'

/**
 * Renders practice widgets for links that apply to the current textbook slug.
 * Returns null when nothing is linked (no empty placeholder).
 */
export default function TextbookLinkedPractices({ links = [], textbookSlug }) {
  if (!links.length) return null

  return (
    <Box
      component="section"
      aria-label="Related practice assignments"
      sx={{
        mt: '2rem',
        pt: '1.25rem',
        borderTop: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Typography
        component="h2"
        sx={{ fontSize: '1.25rem', fontWeight: 600, mb: '0.75em', lineHeight: 1.3 }}
      >
        Practice in HuLA
      </Typography>
      <Typography sx={{ fontSize: '0.9375rem', color: 'text.secondary', mb: '1em', lineHeight: 1.6 }}>
        Your instructor linked the following practice to this chapter.
      </Typography>
      {links.map((link) => (
        <PracticeWidget
          key={link.id}
          practiceId={link.practiceId}
          practiceTitle={link.practiceTitle}
          sectionId={link.sectionId}
          textbookSlug={textbookSlug || link.textbookSlug}
        />
      ))}
    </Box>
  )
}

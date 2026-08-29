import ThemedCard from '../../ui/ThemedCard.jsx'
import {
  DEFAULT_QUESTION_CARD_MIN_HEIGHT,
  DEFAULT_QUESTION_CARD_WIDTH,
} from '../mui/frame/ProblemFrame.jsx'

// derivation card owns shared chrome and intrinsic width for derivation surfaces
// children supply derivation content and must remain within the parent width
export default function DerivationCard({ children }) {
  return (
    <ThemedCard
      sx={{
        p: { xs: 1.25, md: 2.5 },
        width: 'fit-content',
        minWidth: `min(100%, ${DEFAULT_QUESTION_CARD_WIDTH})`,
        minHeight: DEFAULT_QUESTION_CARD_MIN_HEIGHT,
        maxWidth: '100%',
        boxSizing: 'border-box',
        borderRadius: 3,
        border: (theme) => `1px solid ${theme.palette.divider}`,
        position: 'relative',
      }}
    >
      {children}
    </ThemedCard>
  )
}

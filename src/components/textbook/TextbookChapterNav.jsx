import {
  Box,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material'
import {
  ChevronLeft as PrevIcon,
  ChevronRight as NextIcon,
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import {
  getTextbookNeighbors,
  listTextbookNavItems,
  normalizeTextbookSlug,
} from '@/components/textbook/textbookCatalog.js'

export default function TextbookChapterNav({
  slug: rawSlug,
  linkBase = '/student/textbook',
  title,
}) {
  const navigate = useNavigate()
  const slug = normalizeTextbookSlug(rawSlug)
  const { prev, next, entry } = getTextbookNeighbors(slug)
  const items = listTextbookNavItems()

  const go = (targetSlug) => {
    if (!targetSlug) return
    navigate(`${linkBase}/${targetSlug}`)
  }

  const displayTitle = title || entry?.pageTitle || entry?.title || slug

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: { xs: 'stretch', sm: 'center' },
        gap: 1,
        flexWrap: 'wrap',
      }}
    >
      <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flexShrink: 0 }}>
        <Tooltip title={prev ? `Previous: ${prev.pageTitle || prev.title}` : 'No previous chapter'}>
          <span>
            <IconButton
              size="small"
              disabled={!prev}
              onClick={() => go(prev?.slug)}
              aria-label={prev ? `Previous chapter: ${prev.pageTitle || prev.title}` : 'No previous chapter'}
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
        <Tooltip title={next ? `Next: ${next.pageTitle || next.title}` : 'No next chapter'}>
          <span>
            <IconButton
              size="small"
              disabled={!next}
              onClick={() => go(next?.slug)}
              aria-label={next ? `Next chapter: ${next.pageTitle || next.title}` : 'No next chapter'}
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

      <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 280 }, flexGrow: 1 }}>
        <InputLabel id="textbook-chapter-select-label">Chapter</InputLabel>
        <Select
          labelId="textbook-chapter-select-label"
          label="Chapter"
          value={entry ? slug : ''}
          onChange={(event) => go(event.target.value)}
          aria-label="Select textbook chapter"
          sx={{
            '& .MuiSelect-select:focus': {
              backgroundColor: 'transparent',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderWidth: 2,
            },
          }}
        >
          {items.map((item) => (
            <MenuItem
              key={item.slug}
              value={item.slug}
              dense
              sx={{
                fontWeight: item.kind === 'part' || item.kind === 'backmatter' ? 700 : 400,
                pl: item.kind === 'chapter' || item.kind === 'appendix' ? 3 : 1.5,
              }}
            >
              {item.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Typography
        variant="body2"
        color="text.secondary"
        sx={{
          fontSize: '0.875rem',
          display: { xs: 'none', md: 'block' },
          maxWidth: '18rem',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
        title={displayTitle}
      >
        {displayTitle}
      </Typography>
    </Box>
  )
}

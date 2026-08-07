import { useEffect, useMemo, useState } from 'react'
import {
  Box,
  Chip,
  Collapse,
  Stack,
  Typography,
} from '@mui/material'
import {
  ChevronRight as ChevronRightIcon,
  ExpandLess,
  ExpandMore,
  Psychology as PracticeIcon,
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import ThemedCard from '@/components/ui/ThemedCard.jsx'
import { useAppRuntime } from '@/hooks/useAppRuntime.js'
import { useTextbookPracticeLinks } from '@/hooks/useTextbookPracticeLinks.js'
import { useTextbookStructure } from '@/hooks/useTextbookStructure.js'
import { getTextbookManifest } from '@/components/textbook/textbookCatalog.js'
import { linksForTextbookSlug } from '@/components/textbook/textbookPracticeLinks.js'
import { isDividerKind, isNavigableNode } from '@/components/textbook/textbookStructure.js'

/**
 * Learn hub — TOC-first entry to textbook + linked practice.
 * Route: `/student/learn`
 */
export default function LearnHubPage() {
  const navigate = useNavigate()
  const { learnChapterPath, learnPath } = useAppRuntime()
  const { resolvedLinks } = useTextbookPracticeLinks()
  const { numberedTree: tree } = useTextbookStructure()
  const manifest = getTextbookManifest()

  const linkedBySlug = useMemo(() => {
    const map = new Map()
    for (const node of tree) {
      map.set(node.slug, linksForTextbookSlug(resolvedLinks, node.slug))
      for (const child of node.children || []) {
        map.set(child.slug, linksForTextbookSlug(resolvedLinks, child.slug))
      }
    }
    return map
  }, [tree, resolvedLinks])

  const [openParts, setOpenParts] = useState({})

  useEffect(() => {
    setOpenParts((prev) => {
      if (Object.keys(prev).length > 0 || !tree.length) return prev
      const initial = {}
      tree.forEach((node, index) => {
        if (node.children?.length) initial[node.slug] = index < 2
      })
      return Object.keys(initial).length ? initial : prev
    })
  }, [tree])

  const go = (slug) => {
    const path = learnChapterPath?.(slug) || `${learnPath || '/student/learn'}/${slug}`
    navigate(path)
  }

  const togglePart = (slug) => {
    setOpenParts((prev) => ({ ...prev, [slug]: !prev[slug] }))
  }

  const renderLeaf = (item, { nested = false } = {}) => {
    const links = linkedBySlug.get(item.slug) || []
    return (
      <ThemedCard
        key={item.slug}
        sx={{
          cursor: 'pointer',
          ml: nested ? { xs: 0, sm: 2 } : 0,
          '&:hover': { boxShadow: 4 },
          '&:focus-within': {
            outline: '2px solid',
            outlineColor: 'primary.main',
            outlineOffset: 2,
          },
        }}
        onClick={() => go(item.slug)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            go(item.slug)
          }
        }}
        tabIndex={0}
        role="link"
        aria-label={`Open ${item.label}`}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            p: 2,
            justifyContent: 'space-between',
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography
              component="h3"
              sx={{ fontSize: '1.0625rem', fontWeight: 600, lineHeight: 1.3 }}
            >
              {item.label}
            </Typography>
            {links.length > 0 && (
              <Stack direction="row" spacing={0.75} sx={{ mt: 0.75 }} flexWrap="wrap" useFlexGap>
                {links.slice(0, 2).map((link) => (
                  <Chip
                    key={link.id}
                    size="small"
                    icon={<PracticeIcon sx={{ fontSize: '0.875rem !important' }} />}
                    label={link.practiceTitle}
                    variant="outlined"
                    color="primary"
                  />
                ))}
                {links.length > 2 && (
                  <Chip size="small" label={`+${links.length - 2} more`} variant="outlined" />
                )}
              </Stack>
            )}
          </Box>
          <ChevronRightIcon color="action" aria-hidden />
        </Box>
      </ThemedCard>
    )
  }

  return (
    <Box>
      <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ mb: 1 }}>
        <Box>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 600, fontSize: '1.75rem' }}>
            Learn
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: 40 * 16 }}>
            {manifest.bookTitle} - read the chapter, then work linked practice in the same place.
          </Typography>
        </Box>
      </Stack>

      <Stack spacing={1.5} sx={{ mt: 3 }}>
        {tree.map((node) => {
          const isSection = isDividerKind(node.kind) || (node.children?.length > 0 && !isNavigableNode(node))
          if (isSection || node.children?.length) {
            const expanded = Boolean(openParts[node.slug])
            const children = node.children || []
            return (
              <Box key={node.slug}>
                <Box
                  role="button"
                  tabIndex={0}
                  aria-expanded={expanded}
                  aria-label={expanded ? `Collapse ${node.label}` : `Expand ${node.label}`}
                  onClick={() => togglePart(node.slug)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      togglePart(node.slug)
                    }
                  }}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    mb: 1,
                    px: 0.5,
                    py: 0.75,
                    borderBottom: 1,
                    borderColor: 'divider',
                    cursor: 'pointer',
                    userSelect: 'none',
                    '&:hover': { bgcolor: 'action.hover' },
                    '&:focus-visible': {
                      outline: '2px solid',
                      outlineColor: 'primary.main',
                      outlineOffset: 2,
                    },
                  }}
                >
                  <Typography
                    component="h2"
                    sx={{ fontSize: '1.125rem', fontWeight: 700, lineHeight: 1.3 }}
                  >
                    {node.label}
                  </Typography>
                  {expanded ? (
                    <ExpandLess color="action" aria-hidden />
                  ) : (
                    <ExpandMore color="action" aria-hidden />
                  )}
                </Box>
                <Collapse in={expanded}>
                  <Stack spacing={1} sx={{ mb: 1, mt: 1 }}>
                    {children.map((child) => renderLeaf(child, { nested: true }))}
                    {children.length === 0 && (
                      <Typography variant="body2" color="text.secondary" sx={{ px: 1, py: 1 }}>
                        No chapters in this section yet.
                      </Typography>
                    )}
                  </Stack>
                </Collapse>
              </Box>
            )
          }

          if (!isNavigableNode(node)) return null

          return (
            <Box key={node.slug} sx={{ mb: 0.5 }}>
              {renderLeaf(node)}
            </Box>
          )
        })}
      </Stack>
    </Box>
  )
}

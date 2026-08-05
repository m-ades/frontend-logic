import { useEffect, useMemo, useState } from 'react'
import {
  Box,
  Collapse,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Typography,
} from '@mui/material'
import {
  ExpandLess,
  ExpandMore,
  MenuBook as BookIcon,
} from '@mui/icons-material'
import { useTextbookStructure } from '@/hooks/useTextbookStructure.js'

function TocList({
  tree,
  activeSlug,
  onSelect,
  linkedSlugSet,
  dense = false,
}) {
  const initiallyOpen = useMemo(() => {
    const open = {}
    for (const node of tree) {
      if (node.children?.length) {
        const containsActive = node.children.some((child) => child.slug === activeSlug)
        open[node.slug] = containsActive || node.kind === 'part'
      }
    }
    return open
  }, [tree, activeSlug])

  const [openParts, setOpenParts] = useState(initiallyOpen)

  useEffect(() => {
    setOpenParts((prev) => {
      const next = { ...prev }
      for (const node of tree) {
        if (!node.children?.length) continue
        if (node.children.some((child) => child.slug === activeSlug)) {
          next[node.slug] = true
        }
      }
      return next
    })
  }, [activeSlug, tree])

  const togglePart = (slug) => {
    setOpenParts((prev) => ({ ...prev, [slug]: !prev[slug] }))
  }

  return (
    <List
      dense={dense}
      disablePadding
      aria-label="Textbook table of contents"
      sx={{ py: 0.5 }}
    >
      {tree.map((node) => {
        const hasChildren = node.children?.length > 0
        const isActive = node.slug === activeSlug
        const hasLinkedChild =
          hasChildren && node.children.some((child) => linkedSlugSet?.has(child.slug))
        const selfLinked = linkedSlugSet?.has(node.slug)

        if (hasChildren) {
          const expanded = Boolean(openParts[node.slug])
          return (
            <Box key={node.slug} component="li" sx={{ listStyle: 'none' }}>
              <ListItemButton
                onClick={() => togglePart(node.slug)}
                aria-expanded={expanded}
                sx={{
                  py: dense ? 0.5 : 0.75,
                  borderRadius: 1,
                  mx: 0.5,
                  fontWeight: 600,
                  '&:focus-visible': {
                    outline: '2px solid',
                    outlineColor: 'primary.main',
                    outlineOffset: 2,
                  },
                }}
              >
                <ListItemText
                  primary={node.label}
                  primaryTypographyProps={{
                    fontSize: '0.875rem',
                    fontWeight: 700,
                    lineHeight: 1.35,
                  }}
                  secondary={hasLinkedChild ? 'Includes practice' : undefined}
                  secondaryTypographyProps={{ fontSize: '0.75rem' }}
                />
                {expanded ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
              </ListItemButton>
              <Collapse in={expanded} timeout="auto" unmountOnExit>
                <List disablePadding dense={dense}>
                  {/* Part opener page itself */}
                  <ListItemButton
                    selected={isActive}
                    onClick={() => onSelect(node.slug)}
                    sx={{
                      pl: 3,
                      py: dense ? 0.35 : 0.5,
                      borderRadius: 1,
                      mx: 0.5,
                      '&:focus-visible': {
                        outline: '2px solid',
                        outlineColor: 'primary.main',
                        outlineOffset: 2,
                      },
                    }}
                  >
                    <ListItemText
                      primary={`Overview · ${node.label}`}
                      primaryTypographyProps={{
                        fontSize: '0.8125rem',
                        fontWeight: isActive ? 600 : 400,
                        lineHeight: 1.35,
                      }}
                    />
                  </ListItemButton>
                  {node.children.map((child) => {
                    const childActive = child.slug === activeSlug
                    const childLinked = linkedSlugSet?.has(child.slug)
                    return (
                      <ListItemButton
                        key={child.slug}
                        selected={childActive}
                        onClick={() => onSelect(child.slug)}
                        sx={{
                          pl: 3.5,
                          py: dense ? 0.35 : 0.5,
                          borderRadius: 1,
                          mx: 0.5,
                          '&:focus-visible': {
                            outline: '2px solid',
                            outlineColor: 'primary.main',
                            outlineOffset: 2,
                          },
                        }}
                      >
                        <ListItemText
                          primary={child.label}
                          secondary={childLinked ? 'Practice' : undefined}
                          primaryTypographyProps={{
                            fontSize: '0.8125rem',
                            fontWeight: childActive ? 600 : 400,
                            lineHeight: 1.35,
                          }}
                          secondaryTypographyProps={{ fontSize: '0.7rem' }}
                        />
                      </ListItemButton>
                    )
                  })}
                </List>
              </Collapse>
            </Box>
          )
        }

        return (
          <ListItemButton
            key={node.slug}
            selected={isActive}
            onClick={() => onSelect(node.slug)}
            sx={{
              py: dense ? 0.5 : 0.75,
              borderRadius: 1,
              mx: 0.5,
              '&:focus-visible': {
                outline: '2px solid',
                outlineColor: 'primary.main',
                outlineOffset: 2,
              },
            }}
          >
            <ListItemText
              primary={node.label}
              secondary={selfLinked ? 'Practice' : undefined}
              primaryTypographyProps={{
                fontSize: '0.875rem',
                fontWeight: isActive ? 600 : 500,
                lineHeight: 1.35,
              }}
              secondaryTypographyProps={{ fontSize: '0.7rem' }}
            />
          </ListItemButton>
        )
      })}
    </List>
  )
}

/**
 * Hierarchical textbook TOC — rail (desktop) or controlled drawer (mobile).
 */
export default function TextbookTocNav({
  activeSlug,
  onSelect,
  linkedSlugs = [],
  variant = 'rail', // 'rail' | 'drawer'
  drawerOpen = false,
  onDrawerClose,
  title = 'Contents',
  tree: treeProp,
}) {
  const { numberedTree } = useTextbookStructure()
  const tree = treeProp || numberedTree
  const linkedSlugSet = useMemo(() => new Set(linkedSlugs), [linkedSlugs])

  const header = (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 1.25 }}>
      <BookIcon fontSize="small" color="action" aria-hidden />
      <Typography component="h2" sx={{ fontSize: '0.9375rem', fontWeight: 700 }}>
        {title}
      </Typography>
    </Box>
  )

  const body = (
    <TocList
      tree={tree}
      activeSlug={activeSlug}
      onSelect={(slug) => {
        onSelect(slug)
        onDrawerClose?.()
      }}
      linkedSlugSet={linkedSlugSet}
      dense={variant === 'rail'}
    />
  )

  if (variant === 'drawer') {
    return (
      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={onDrawerClose}
        ModalProps={{ keepMounted: true }}
        PaperProps={{
          sx: { width: { xs: 'min(100vw - 2rem, 20rem)', sm: '20rem' } },
          'aria-label': 'Textbook contents',
        }}
      >
        {header}
        <Box sx={{ overflow: 'auto', flex: 1, pb: 2 }}>{body}</Box>
      </Drawer>
    )
  }

  return (
    <Box
      component="nav"
      aria-label="Textbook contents"
      sx={{
        height: '100%',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        borderRight: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
        overflow: 'hidden',
      }}
    >
      {header}
      <Box sx={{ overflow: 'auto', flex: 1, minHeight: 0, pb: 1 }}>{body}</Box>
    </Box>
  )
}

export { TocList }

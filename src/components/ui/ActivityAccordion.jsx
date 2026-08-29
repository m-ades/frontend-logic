import { useEffect, useRef, useState } from 'react'
import {
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  Chip,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import FolderIcon from '@mui/icons-material/Folder'
import LoadingSpinner from './LoadingSpinner.jsx'

export default function ActivityAccordion({
  title,
  courseStructure,
  renderActivity,
  emptyText = 'No activities available',
  showCollapseAll = true,
  showExpandCollapseToggle = false,
  isLoading = false,
  defaultExpanded = true,
  defaultSubchapterExpanded = defaultExpanded,
  persistKey = null,
  storage = 'local',
}) {
  const [expandedChapters, setExpandedChapters] = useState({})
  const [expandedSubchapters, setExpandedSubchapters] = useState({})
  const hasHydratedRef = useRef(false)

  const storageKey = persistKey ? `activity-accordion:${persistKey}` : null
  const storageObject = typeof window === 'undefined'
    ? null
    : storage === 'session'
    ? window.sessionStorage
    : window.localStorage

  useEffect(() => {
    if (!storageKey || !storageObject) return
    if (hasHydratedRef.current) return
    if (!courseStructure?.length) return
    try {
      const raw = storageObject.getItem(storageKey)
      if (raw) {
        const parsed = JSON.parse(raw)
        setExpandedChapters(parsed?.expandedChapters || {})
        setExpandedSubchapters(parsed?.expandedSubchapters || {})
      }
      hasHydratedRef.current = true
    } catch (error) {
      console.warn('Failed to restore accordion state', error)
      hasHydratedRef.current = true
    }
  }, [courseStructure, storageKey, storageObject])

  useEffect(() => {
    if (!storageKey || !storageObject) return
    if (!hasHydratedRef.current) return
    try {
      storageObject.setItem(
        storageKey,
        JSON.stringify({
          expandedChapters,
          expandedSubchapters,
        })
      )
    } catch (error) {
      console.warn('Failed to persist accordion state', error)
    }
  }, [expandedChapters, expandedSubchapters, storageKey, storageObject])

  const handleChapterChange = (chapterId) => (event, isExpanded) => {
    setExpandedChapters((prev) => ({
      ...prev,
      [chapterId]: isExpanded,
    }))
    if (!isExpanded) return
    const chapter = courseStructure.find((item) => item.id === chapterId)
    if (!chapter) return
    setExpandedSubchapters((prev) => {
      const next = { ...prev }
      chapter.subchapters.forEach((subchapter) => {
        next[subchapter.id] = true
      })
      return next
    })
  }

  const handleSubchapterChange = (subchapterId) => (event, isExpanded) => {
    setExpandedSubchapters((prev) => ({
      ...prev,
      [subchapterId]: isExpanded,
    }))
  }

  const setAllExpanded = (expanded) => {
    const nextState = {}
    courseStructure.forEach((chapter) => {
      nextState[chapter.id] = expanded
      chapter.subchapters.forEach((subchapter) => {
        nextState[subchapter.id] = expanded
      })
    })
    setExpandedChapters(nextState)
    setExpandedSubchapters(nextState)
  }

  const isChapterExpandedById = (chapterId) => expandedChapters[chapterId] ?? defaultExpanded
  const isSubchapterExpandedById = (subchapterId) => expandedSubchapters[subchapterId] ?? defaultSubchapterExpanded
  const isAnyCollapsed = courseStructure.some((chapter) => {
    if (!isChapterExpandedById(chapter.id)) return true
    return chapter.subchapters.some((subchapter) => !isSubchapterExpandedById(subchapter.id))
  })
  const titleNode = title ? (
    <Typography
      variant="h4"
      component="h1"
      sx={{
        fontWeight: 600,
        color: 'text.primary',
        letterSpacing: '-0.02em',
      }}
    >
      {title}
    </Typography>
  ) : null

  if (isLoading) {
    return (
      <Box sx={{ p: 2 }}>
        {titleNode && <Box sx={{ mb: 3 }}>{titleNode}</Box>}
        <LoadingSpinner label="Loading activities..." />
      </Box>
    )
  }

  if (!courseStructure?.length) {
    return (
      <Box sx={{ width: '100%', maxWidth: 1200, ml: 0, mr: 'auto' }}>
        {titleNode && <Box sx={{ mb: 3 }}>{titleNode}</Box>}
        <Box
          sx={{
            textAlign: 'center',
            py: 4,
            px: 3,
            borderRadius: 2,
            border: '1px dashed',
            borderColor: 'divider',
          }}
        >
          <Typography color="text.secondary">{emptyText}</Typography>
        </Box>
      </Box>
    )
  }

  return (
    <Box sx={{ width: '100%', maxWidth: 1200, ml: 0, mr: 'auto' }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 2,
        }}
      >
        {titleNode}
        {showExpandCollapseToggle ? (
          <Typography
            variant="body2"
            onClick={() => setAllExpanded(isAnyCollapsed)}
            sx={{
              cursor: 'pointer',
              color: 'primary.main',
              fontWeight: 500,
              '&:hover': {
                textDecoration: 'underline',
              },
            }}
          >
            {isAnyCollapsed ? 'Expand all' : 'Collapse all'}
          </Typography>
        ) : (
          showCollapseAll && (
            <Typography
              variant="body2"
              onClick={() => setAllExpanded(false)}
              sx={{
                cursor: 'pointer',
                color: 'primary.main',
                fontWeight: 500,
                '&:hover': {
                  textDecoration: 'underline',
                },
              }}
            >
              Collapse all
            </Typography>
          )
        )}
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {courseStructure.map((chapter) => {
          const chapterActivityCount = chapter.subchapters.reduce(
            (total, subchapter) => total + subchapter.activities.length,
            0
          )
          const isChapterExpanded = isChapterExpandedById(chapter.id)

          return (
            <Accordion
              key={chapter.id}
              expanded={isChapterExpanded}
              onChange={handleChapterChange(chapter.id)}
              elevation={0}
              slots={{ heading: 'h2' }}
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1.5,
                backgroundColor: 'background.paper',
                boxShadow: 'none !important',
                '&:before': { display: 'none' },
                '&.Mui-expanded': {
                  margin: 0,
                },
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                sx={{
                  px: 2,
                  py: 1,
                  minHeight: 56,
                  '&.Mui-expanded': {
                    minHeight: 56,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                  },
                  '& .MuiAccordionSummary-content': {
                    my: 0,
                    '&.Mui-expanded': {
                      my: 0,
                    },
                  },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, width: '100%' }}>
                  <FolderIcon sx={{ color: 'primary.main', fontSize: 22 }} />
                  <Box sx={{ flex: 1 }}>
                    <Typography
                      variant="h6"
                      component="span"
                      sx={{
                        fontWeight: 600,
                        color: 'text.primary',
                      }}
                    >
                      {chapter.title}
                    </Typography>
                  </Box>
                  <Chip
                    label={`${chapterActivityCount} ${chapterActivityCount === 1 ? 'activity' : 'activities'}`}
                    size="small"
                    sx={(theme) => ({
                      height: 24,
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      backgroundColor: alpha(theme.palette.primary.main, 0.12),
                      color: 'primary.main',
                    })}
                  />
                </Box>
              </AccordionSummary>

              <AccordionDetails sx={{ p: 0 }}>
                <List sx={{ width: '100%', py: 0 }}>
                  {chapter.subchapters.map((subchapter) => {
                    const isSubchapterExpanded = isSubchapterExpandedById(subchapter.id)

                    return (
                      <ListItem
                        key={subchapter.id}
                        disablePadding
                        sx={{
                          flexDirection: 'column',
                          alignItems: 'stretch',
                          borderBottom: '1px solid',
                          borderColor: 'divider',
                          '&:last-child': {
                            borderBottom: 'none',
                          },
                        }}
                      >
                        <Accordion
                          expanded={isSubchapterExpanded}
                          onChange={handleSubchapterChange(subchapter.id)}
                          elevation={0}
                          slots={{ heading: 'h3' }}
                          sx={{
                            width: '100%',
                            boxShadow: 'none !important',
                            '&:before': { display: 'none' },
                            backgroundColor: 'transparent',
                          }}
                        >
                          <AccordionSummary
                            expandIcon={<ExpandMoreIcon sx={{ fontSize: 20 }} />}
                            sx={{
                              px: 2,
                              py: 0.5,
                              minHeight: 40,
                              '&.Mui-expanded': {
                                minHeight: 40,
                              },
                              '& .MuiAccordionSummary-content': {
                                my: 0,
                                '&.Mui-expanded': {
                                  my: 0,
                                },
                              },
                            }}
                          >
                            <Typography
                              variant="subtitle1"
                              component="span"
                              sx={{
                                fontWeight: 500,
                                color: 'text.primary',
                              }}
                            >
                              {subchapter.title}
                            </Typography>
                          </AccordionSummary>

                          <AccordionDetails sx={{ px: 0.5, py: 0 }}>
                            <Box
                              sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                '& > *:not(:last-child)': {
                                  borderBottom: '1px solid',
                                  borderColor: 'divider',
                                },
                              }}
                            >
                              {subchapter.activities.map((activity) => renderActivity(activity))}
                            </Box>
                          </AccordionDetails>
                        </Accordion>
                      </ListItem>
                    )
                  })}
                </List>
              </AccordionDetails>
            </Accordion>
          )
        })}
      </Box>
    </Box>
  )
}

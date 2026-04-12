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
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import FolderIcon from '@mui/icons-material/Folder'
import LoadingSpinner from './LoadingSpinner.jsx'

export default function ActivityAccordion({
  title,
  courseStructure,
  renderActivity,
  emptyText = 'No activities available',
  showCollapseAll = true,
  showExpandAll = false,
  showExpandCollapseToggle = false,
  isLoading = false,
  defaultExpanded = true,
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
  const isSubchapterExpandedById = (subchapterId) => expandedSubchapters[subchapterId] ?? defaultExpanded
  const isAnyCollapsed = courseStructure.some((chapter) => {
    if (!isChapterExpandedById(chapter.id)) return true
    return chapter.subchapters.some((subchapter) => !isSubchapterExpandedById(subchapter.id))
  })

  if (isLoading) {
    return (
      <Box sx={{ p: 3 }}>
        <LoadingSpinner label="Loading activities..." />
      </Box>
    )
  }

  if (!courseStructure?.length) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="text.secondary" align="center">
          {emptyText}
        </Typography>
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
          mb: 4,
        }}
      >
        <Typography
          variant="h4"
          sx={{
            fontWeight: 600,
            color: 'text.primary',
            letterSpacing: '-0.02em',
          }}
        >
          {title}
        </Typography>
        {showExpandCollapseToggle && (
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
        )}
        {!showExpandCollapseToggle && showCollapseAll && (
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
        )}
        {!showExpandCollapseToggle && showExpandAll && (
          <Typography
            variant="body2"
            onClick={() => setAllExpanded(true)}
            sx={{
              cursor: 'pointer',
              color: 'primary.main',
              fontWeight: 500,
              '&:hover': {
                textDecoration: 'underline',
              },
            }}
          >
            Expand all
          </Typography>
        )}
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
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
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
                '&:before': { display: 'none' },
                '&.Mui-expanded': {
                  margin: 0,
                  '&:not(:last-child)': {
                    marginBottom: 2,
                  },
                },
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                sx={{
                  px: 3,
                  py: 2,
                  minHeight: 64,
                  '&.Mui-expanded': {
                    minHeight: 64,
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
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                  <FolderIcon sx={{ color: 'primary.main', fontSize: 24 }} />
                  <Box sx={{ flex: 1 }}>
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 600,
                        color: 'text.primary',
                        mb: 0.5,
                      }}
                    >
                      {chapter.title}
                    </Typography>
                  </Box>
                  <Chip
                    label={`${chapterActivityCount} activities`}
                    size="small"
                    sx={{
                      height: 24,
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      backgroundColor: 'background.light',
                      color: 'primary.main',
                    }}
                  />
                </Box>
              </AccordionSummary>

              <AccordionDetails sx={{ p: 0 }}>
                <List sx={{ width: '100%', py: 1 }}>
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
                          sx={{
                            width: '100%',
                            boxShadow: 'none',
                            '&:before': { display: 'none' },
                            backgroundColor: 'transparent',
                          }}
                        >
                          <AccordionSummary
                            expandIcon={<ExpandMoreIcon sx={{ fontSize: 20 }} />}
                            sx={{
                              px: 3,
                              py: 1.5,
                              minHeight: 48,
                              '&.Mui-expanded': {
                                minHeight: 48,
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
                              sx={{
                                fontWeight: 500,
                                color: 'text.primary',
                              }}
                            >
                              {subchapter.title}
                            </Typography>
                          </AccordionSummary>

                          <AccordionDetails sx={{ px: 3, py: 2, pt: 1 }}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                              {subchapter.activities.map((activity, idx) =>
                                renderActivity(activity, {
                                  chapter,
                                  subchapter,
                                  activityIndex: idx,
                                })
                              )}
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

import { useEffect, useRef, useState } from 'react'
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  Typography,
  Divider,
} from '@mui/material'
import { ExpandMore as ExpandIcon } from '@mui/icons-material'
import { useNavigate, useLocation } from 'react-router-dom'

export default function SidebarLink({
  link,
  icon,
  label,
  children,
  isSidebarOpened,
  toggleDrawer,
  type,
  nested,
  alignWithParent,
}) {
  const [isOpen, setIsOpen] = useState(false)
  const openTimerRef = useRef(null)
  const closeTimerRef = useRef(null)
  const navigate = useNavigate()
  const currentLocation = useLocation()

  const isLinkActive = link && (
    currentLocation.pathname === link ||
    (link !== '/' && currentLocation.pathname.startsWith(link + '/'))
  )

  useEffect(() => {
    return () => {
      if (openTimerRef.current) clearTimeout(openTimerRef.current)
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    }
  }, [])

  const handleClick = (e) => {
    if (link) {
      navigate(link)
      if (!isSidebarOpened) toggleDrawer()
      return
    }
    if (children && isSidebarOpened) {
      e.preventDefault()
      setIsOpen(!isOpen)
    }
  }

  if (type === 'title') {
    return (
      <Typography
        variant="overline"
        sx={{
          px: 2,
          py: 1,
          fontSize: '0.75rem',
          fontWeight: 600,
          color: 'text.secondary',
          letterSpacing: '0.08em',
          display: isSidebarOpened ? 'block' : 'none',
        }}
      >
        {label}
      </Typography>
    )
  }

  if (type === 'divider') {
    return <Divider sx={{ my: 1 }} />
  }

  if (!children) {
    return (
      <ListItem disablePadding>
        <ListItemButton
          onClick={handleClick}
          selected={isLinkActive}
          sx={(theme) => ({
            borderRadius: 1,
            mb: 0.5,
            minHeight: 40,
            pl: nested && !alignWithParent ? 4 : 2,
            '&.Mui-selected': {
              backgroundColor: 'background.light',
              '&:hover': {
                backgroundColor: 'background.light',
              },
              '& .MuiListItemIcon-root': {
                color: 'primary.main',
              },
              '& .MuiListItemText-primary': {
                color: 'primary.main',
                fontWeight: 600,
              },
            },
            '&:hover': {
              backgroundColor: 'background.light',
            },
            '&:hover .MuiListItemText-primary': {
              color: theme.palette.text.primary,
              fontWeight: 500,
            },
            '&:hover .MuiListItemIcon-root': {
              color: theme.palette.text.primary,
            },
          })}
        >
          <ListItemIcon
            sx={{
              minWidth: 40,
              color: isLinkActive ? 'primary.main' : 'text.secondary',
            }}
          >
            {icon}
          </ListItemIcon>
          {isSidebarOpened && (
            <ListItemText
              primary={label}
              primaryTypographyProps={{
                fontSize: '0.875rem',
                fontWeight: isLinkActive ? 600 : 400,
              }}
            />
          )}
        </ListItemButton>
      </ListItem>
    )
  }

  return (
    <Box
      onMouseEnter={() => {
        if (!isSidebarOpened) return
        if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
        openTimerRef.current = setTimeout(() => setIsOpen(true), 120)
      }}
      onMouseLeave={() => {
        if (!isSidebarOpened) return
        if (openTimerRef.current) clearTimeout(openTimerRef.current)
        closeTimerRef.current = setTimeout(() => setIsOpen(false), 180)
      }}
    >
      <ListItem disablePadding>
        <ListItemButton
          onClick={handleClick}
          selected={isLinkActive}
          sx={(theme) => ({
            borderRadius: 1,
            mb: 0.5,
            minHeight: 40,
            pl: 2,
            '&.Mui-selected': {
              backgroundColor: 'background.light',
            },
            '&:hover': {
              backgroundColor: 'background.light',
            },
            '&:hover .MuiListItemText-primary': {
              color: theme.palette.text.primary,
              fontWeight: 500,
            },
            '&:hover .MuiListItemIcon-root': {
              color: theme.palette.text.primary,
            },
          })}
        >
          <ListItemIcon
            sx={{
              minWidth: 40,
              color: isLinkActive ? 'primary.main' : 'text.secondary',
            }}
          >
            {icon}
          </ListItemIcon>
          {isSidebarOpened && (
            <>
              <ListItemText
                primary={label}
                primaryTypographyProps={{
                  fontSize: '0.875rem',
                  fontWeight: isLinkActive ? 600 : 400,
                }}
              />
              <ExpandIcon
                sx={{
                  transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s',
                  color: 'text.secondary',
                }}
              />
            </>
          )}
        </ListItemButton>
      </ListItem>
      {children && (
        <Collapse in={isOpen && isSidebarOpened} timeout={280} unmountOnExit>
          <List component="div" disablePadding>
            {children.map((childLink, idx) => (
              <SidebarLink
                key={childLink.link || `child-${idx}`}
                isSidebarOpened={isSidebarOpened}
                toggleDrawer={toggleDrawer}
                nested
                {...childLink}
              />
            ))}
          </List>
        </Collapse>
      )}
    </Box>
  )
}

import { useState, useEffect, useRef } from "react";
import {
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  useTheme,
  useMediaQuery,
  Box,
  Typography,
  Avatar,
  Menu,
  MenuItem,
} from "@mui/material";
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
} from "@mui/icons-material";
import {
  useLayoutState,
  useLayoutDispatch,
  toggleSidebar,
  setSidebar,
} from "../../context/LayoutContext.jsx";
import SidebarLink from "./SidebarLink.jsx";
import CourseSelector from "../ui/CourseSelector.jsx";
import { useAppRuntime } from "../../hooks/useAppRuntime.js";

const DRAWER_WIDTH = 240;

export default function Sidebar({ structure, location, onSignOut, onOpenSettings }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { isSidebarOpened, sidebarHoverEnabled } = useLayoutState();
  const { user: activeUser, isSandbox: sandbox, courseState } = useAppRuntime();
  const layoutDispatch = useLayoutDispatch();
  const drawerPaperRef = useRef(null);
  const [isPermanent, setPermanent] = useState(true);
  const [profileMenu, setProfileMenu] = useState(null);
  const [isHovering, setIsHovering] = useState(false);
  const [manuallyOpened, setManuallyOpened] = useState(false);
  const activeCourse = courseState?.courses?.find(
    (course) => String(course.id) === String(courseState.activeCourseId)
  );
  const textbookAvailable =
    (activeCourse?.logicSystem ?? activeCourse?.logic_system) === "fitch";
  const visibleStructure = textbookAvailable
    ? structure
    : structure.filter((item) => !/\/textbook(?:-links)?$/.test(item.link));

  useEffect(() => {
    const handleResize = () => {
      const isSmallScreen = window.innerWidth < theme.breakpoints.values.md;
      setPermanent(!isSmallScreen);
    };

    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, [theme.breakpoints.values.md]);

  const handleDrawerToggle = () => {
    if (!isPermanent && isSidebarOpened) {
      const activeElement = document.activeElement;
      if (activeElement instanceof HTMLElement && drawerPaperRef.current?.contains(activeElement)) {
        // let focus leave before the drawer goes dark
        activeElement.blur();
      }
    }

    if (sidebarHoverEnabled) {
      setManuallyOpened(!manuallyOpened);
      toggleSidebar(layoutDispatch);
    } else {
      toggleSidebar(layoutDispatch);
    }
  };

  const handleMouseEnter = () => {
    if (sidebarHoverEnabled && isPermanent && !manuallyOpened) {
      setIsHovering(true);
      setSidebar(layoutDispatch, true);
    }
  };

  const handleMouseLeave = () => {
    if (sidebarHoverEnabled && isPermanent && isHovering && !manuallyOpened) {
      setIsHovering(false);
      setSidebar(layoutDispatch, false);
    }
  };

  useEffect(() => {
    if (!sidebarHoverEnabled) {
      setManuallyOpened(false);
      setIsHovering(false);
    }
  }, [sidebarHoverEnabled]);

  // Get user's initials for avatar
  const getUserInitials = () => {
    if (!activeUser?.username) return "U";
    return activeUser.username.substring(0, 2).toUpperCase();
  };

  // Get display name
  const getDisplayName = () => {
    if (!activeUser?.username) return "User";
    return activeUser.username;
  };

  return (
    <Drawer
      variant={isPermanent ? "permanent" : "temporary"}
      open={isSidebarOpened}
      onClose={handleDrawerToggle}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      slotProps={{
        paper: {
          ref: drawerPaperRef,
          component: "nav",
          "aria-label": "Site navigation",
        },
      }}
      sx={{
        width: isSidebarOpened ? DRAWER_WIDTH : 85,
        flexShrink: 0,
        transition: theme.transitions.create(["width", "transform"], {
          easing: theme.transitions.easing.easeInOut,
          duration: theme.transitions.duration.standard,
        }),
        "& .MuiDrawer-paper": {
          width: isSidebarOpened ? DRAWER_WIDTH : 85,
          transition: theme.transitions.create(["width", "transform"], {
            easing: theme.transitions.easing.easeInOut,
            duration: theme.transitions.duration.standard,
          }),
          willChange: "width, transform",
          display: "flex",
          flexDirection: "column",
          height: { xs: "100dvh", md: "100vh" },
          maxHeight: { xs: "100dvh", md: "100vh" },
          overflowX: "hidden",
          overflowY: "hidden",
          borderRight: "1px solid",
          borderColor: "divider",
          boxSizing: "border-box",
          [theme.breakpoints.down("md")]: {
            width: DRAWER_WIDTH,
          },
        },
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 64,
          px: 2,
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        <Typography
          variant="h6"
          component="div"
          sx={{
            fontSize: '1rem',
            fontWeight: 700,
            color: "primary.main",
            letterSpacing: 1,
          }}
        >
          {isSidebarOpened ? "HuLA" : "H"}
        </Typography>
      </Box>

      <CourseSelector isSidebarOpened={isSidebarOpened} />

      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          flexGrow: 1,
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        <List sx={{ mt: 1, px: 1, flexGrow: 1, minHeight: 0, overflowY: "auto" }}>
          {visibleStructure.map((link) => (
            <SidebarLink
              key={link.id}
              location={location}
              isSidebarOpened={isSidebarOpened}
              isTemporary={!isPermanent}
              toggleDrawer={handleDrawerToggle}
              {...link}
            />
          ))}
        </List>

        <Box
          sx={{
            px: 1,
            pt: 1,
            pb: isMobile ? "max(16px, env(safe-area-inset-bottom, 0px))" : 2,
            mt: "auto",
            flexShrink: 0,
            backgroundColor: "background.paper",
            borderTop: "1px solid",
            borderColor: "divider",
            position: "sticky",
            bottom: 0,
            zIndex: 1,
          }}
        >
          {!sidebarHoverEnabled && (
            <ListItem disablePadding>
              <ListItemButton
                onClick={handleDrawerToggle}
                sx={{
                  minHeight: 48,
                  justifyContent: isSidebarOpened ? "initial" : "center",
                  px: 2.5,
                  borderRadius: 1,
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 0,
                    mr: isSidebarOpened ? 3 : "auto",
                    justifyContent: "center",
                  }}
                >
                  {isSidebarOpened ? <ChevronLeftIcon /> : <ChevronRightIcon />}
                </ListItemIcon>
                <ListItemText
                  primary={isSidebarOpened ? "Collapse Sidebar" : ""}
                  primaryTypographyProps={{ fontSize: '1rem' }}
                  sx={{ opacity: isSidebarOpened ? 1 : 0 }}
                />
              </ListItemButton>
            </ListItem>
          )}

          <ListItem disablePadding>
            <ListItemButton
              onClick={(e) => setProfileMenu(e.currentTarget)}
              sx={{
                minHeight: 48,
                justifyContent: isSidebarOpened ? "initial" : "center",
                px: 2.5,
                borderRadius: 1,
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 0,
                  mr: isSidebarOpened ? 3 : "auto",
                  justifyContent: "center",
                }}
              >
                <Avatar sx={{ width: 32, height: 32, bgcolor: "primary.main" }}>
                  <Typography sx={{ fontSize: '1rem', fontWeight: 600 }}>
                    {getUserInitials()}
                  </Typography>
                </Avatar>
              </ListItemIcon>
              <ListItemText
                primary={getDisplayName()}
                primaryTypographyProps={{ fontSize: '1rem' }}
                sx={{ opacity: isSidebarOpened ? 1 : 0 }}
              />
            </ListItemButton>
          </ListItem>

          <Menu
            anchorEl={profileMenu}
            open={Boolean(profileMenu)}
            onClose={() => setProfileMenu(null)}
            anchorOrigin={{ vertical: "top", horizontal: "right" }}
            transformOrigin={{ vertical: "bottom", horizontal: "left" }}
            slotProps={{ paper: { sx: { '& .MuiListItemText-primary': { fontSize: '1rem' } } } }}
          >
          {onOpenSettings && (
            <MenuItem
              onClick={() => {
                onOpenSettings?.();
                setProfileMenu(null);
              }}
            >
              Settings
            </MenuItem>
          )}
          <MenuItem
            onClick={() => {
              onSignOut?.();
              setProfileMenu(null);
            }}
          >
            {sandbox ? "Exit demo" : "Sign Out"}
          </MenuItem>
          </Menu>
        </Box>
      </Box>
    </Drawer>
  );
}

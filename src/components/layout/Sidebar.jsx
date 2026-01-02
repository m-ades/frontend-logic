import { useState, useEffect } from "react";
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
  Divider,
} from "@mui/material";
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Person as AccountIcon,
} from "@mui/icons-material";
import {
  useLayoutState,
  useLayoutDispatch,
  toggleSidebar,
} from "../../context/LayoutContext.jsx";
import SidebarLink from "./SidebarLink.jsx";

const DRAWER_WIDTH = 240;

export default function Sidebar({ structure, location, onSignOut }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { isSidebarOpened } = useLayoutState();
  const layoutDispatch = useLayoutDispatch();
  const [isPermanent, setPermanent] = useState(true);
  const [profileMenu, setProfileMenu] = useState(null);

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
    toggleSidebar(layoutDispatch);
  };

  return (
    <Drawer
      variant={isPermanent ? "permanent" : "temporary"}
      open={isSidebarOpened}
      onClose={handleDrawerToggle}
      sx={{
        width: isSidebarOpened ? DRAWER_WIDTH : 85,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: isSidebarOpened ? DRAWER_WIDTH : 85,
          transition: theme.transitions.create("width", {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
          overflowX: "hidden",
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
          sx={{
            fontWeight: 700,
            color: "primary.main",
            letterSpacing: 1,
            display: isSidebarOpened ? "block" : "none",
          }}
        >
          LOGO
        </Typography>
      </Box>

      <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <List sx={{ mt: 1, px: 1, flexGrow: 1 }}>
          {structure.map((link) => (
            <SidebarLink
              key={link.id}
              location={location}
              isSidebarOpened={isSidebarOpened}
              toggleDrawer={handleDrawerToggle}
              {...link}
            />
          ))}
        </List>

        <Box sx={{ px: 1, pb: 2 }}>
          <Divider sx={{ mb: 1 }} />

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
                sx={{ opacity: isSidebarOpened ? 1 : 0 }}
              />
            </ListItemButton>
          </ListItem>

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
                  <AccountIcon sx={{ fontSize: 20 }} />
                </Avatar>
              </ListItemIcon>
              <ListItemText
                primary="Profile"
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
          >
            <MenuItem
              onClick={() => {
                onSignOut?.();
                setProfileMenu(null);
              }}
            >
              Sign Out
            </MenuItem>
          </Menu>
        </Box>
      </Box>
    </Drawer>
  );
}

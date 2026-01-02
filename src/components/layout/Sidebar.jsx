import { useState, useEffect } from "react";
import {
  Drawer,
  IconButton,
  List,
  Toolbar,
  useTheme,
  useMediaQuery,
  Box,
  Typography,
} from "@mui/material";
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
} from "@mui/icons-material";
import {
  useLayoutState,
  useLayoutDispatch,
  toggleSidebar,
} from "../../context/LayoutContext.jsx";
import SidebarLink from "./SidebarLink.jsx";

const DRAWER_WIDTH = 240;

export default function Sidebar({ structure, location }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { isSidebarOpened } = useLayoutState();
  const layoutDispatch = useLayoutDispatch();
  const [isPermanent, setPermanent] = useState(true);

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
          justifyContent: "space-between",
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
        <IconButton
          onClick={handleDrawerToggle}
          sx={{ display: { xs: "none", md: "flex" } }}
        >
          {isSidebarOpened ? <ChevronLeftIcon /> : <ChevronRightIcon />}
        </IconButton>
      </Box>
      {!isPermanent && (
        <Box sx={{ mt: 0.5, ml: 3, display: { md: "none" } }}>
          <IconButton onClick={handleDrawerToggle}>
            <ArrowBackIcon />
          </IconButton>
        </Box>
      )}
      <List sx={{ mt: 1, px: 1 }}>
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
    </Drawer>
  );
}

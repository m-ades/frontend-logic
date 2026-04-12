import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Breadcrumbs,
  Link,
  IconButton,
  Button,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { Menu as MenuIcon, MenuBook as MenuBookIcon, ArrowBack as ArrowBackIcon } from "@mui/icons-material";
import { ChevronRight } from "lucide-react";
import { Link as RouterLink, useLocation } from "react-router-dom";
import ThemeToggle from "./ThemeToggle.jsx";
import {
  useLayoutDispatch,
  useLayoutState,
  toggleSidebar,
  closeRulesReference,
  openRulesReference,
} from "../../context/LayoutContext.jsx";
import { useAppRuntime } from "../../hooks/useAppRuntime.js";

export default function Header({ onSignOut }) {
  const location = useLocation();
  const { courses, activeCourseId, coursesPath, getBreadcrumbInfo, isSandbox: sandbox } = useAppRuntime();
  const layoutDispatch = useLayoutDispatch();
  const { isRulesReferenceOpen } = useLayoutState();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const activeCourse = courses.find((c) => c.id === activeCourseId);
  const pageInfo = getBreadcrumbInfo(location.pathname);

  return (
    <AppBar
      position="sticky"
      sx={{
        backgroundColor: "background.paper",
        color: "text.primary",
        boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
        borderBottom: "1px solid",
        borderColor: "divider",
      }}
    >
      <Toolbar>
        {isMobile && (
          <IconButton
            edge="start"
            aria-label="Open navigation"
            onClick={() => toggleSidebar(layoutDispatch)}
            sx={{ mr: 1 }}
          >
            <MenuIcon />
          </IconButton>
        )}
        <Box
          sx={{ flexGrow: 1, display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}
        >
          <Box sx={{ minWidth: 0, display: "flex", alignItems: "center" }}>
            {activeCourse ? (
              <Breadcrumbs
                separator={<ChevronRight size={16} />}
                sx={{
                  "& .MuiBreadcrumbs-separator": {
                    mx: 1,
                    color: "text.disabled",
                  },
                }}
              >
                <Link
                  component={RouterLink}
                  to={coursesPath}
                  underline="hover"
                  color="text.primary"
                  variant="body1"
                  sx={{ fontWeight: 600 }}
                >
                  {activeCourse.code}
                </Link>
                <Link
                  component={RouterLink}
                  to={pageInfo.path}
                  underline="hover"
                  color="text.secondary"
                  variant="body1"
                >
                  {pageInfo.label}
                </Link>
              </Breadcrumbs>
            ) : (
              <Typography
                variant="body1"
                sx={{
                  fontWeight: 600,
                  color: "text.primary",
                }}
              >
                {pageInfo.label}
              </Typography>
            )}
          </Box>
          {sandbox && (
            <Button
              onClick={onSignOut}
              variant="outlined"
              size="small"
              startIcon={<ArrowBackIcon />}
              sx={{
                textTransform: 'none',
                flexShrink: 0,
              }}
            >
              Exit demo
            </Button>
          )}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Button
            onClick={() => {
              if (isRulesReferenceOpen) {
                closeRulesReference(layoutDispatch);
                return;
              }
              openRulesReference(layoutDispatch);
            }}
            startIcon={<MenuBookIcon />}
            aria-pressed={isRulesReferenceOpen}
            sx={{ 
              textTransform: 'none',
              color: 'primary.main',
              '&:hover': {
                backgroundColor: 'rgba(47, 107, 255, 0.08)',
              }
            }}
          >
            Rulebook
          </Button>
          <ThemeToggle />
        </Box>
      </Toolbar>
    </AppBar>
  );
}

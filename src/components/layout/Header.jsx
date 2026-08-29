import { useEffect } from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Breadcrumbs,
  Link,
  IconButton,
  Button,
  Tooltip,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  Menu as MenuIcon,
  MenuBook as MenuBookIcon,
  ArrowBack as ArrowBackIcon,
} from "@mui/icons-material";
import { ChevronRight } from "lucide-react";
import { Link as RouterLink, useLocation } from "react-router-dom";
import ThemeToggle from "./ThemeToggle.jsx";
import {
  useLayoutDispatch,
  useLayoutState,
  toggleSidebar,
  dismissRulesReferenceHint,
  setRulesReferenceOpen,
} from "../../context/LayoutContext.jsx";
import { useAppRuntime } from "../../hooks/useAppRuntime.js";

// rulebook availability is owned by the containing route and is independent of question type
export default function Header({ onSignOut, showRulesReference = false }) {
  const location = useLocation();
  const { courses, activeCourseId, coursesPath, getBreadcrumbInfo, isSandbox: sandbox } = useAppRuntime();
  const layoutDispatch = useLayoutDispatch();
  const { isRulesReferenceOpen, showRulesReferenceHint } = useLayoutState();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const activeCourse = courses.find((c) => c.id === activeCourseId);
  const pageInfo = getBreadcrumbInfo(location.pathname, location.state?.returnTo);

  useEffect(() => {
    if (!showRulesReferenceHint) return undefined;
    const timer = window.setTimeout(() => {
      dismissRulesReferenceHint(layoutDispatch);
    }, 8000);
    return () => window.clearTimeout(timer);
  }, [layoutDispatch, showRulesReferenceHint]);

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
          {showRulesReference && (
            <Tooltip
              title={isRulesReferenceOpen ? "Close rulebook" : "Need rules or keyboard shortcuts?"}
              open={showRulesReferenceHint || undefined}
              onClose={() => dismissRulesReferenceHint(layoutDispatch)}
              placement="bottom"
              arrow
            >
              <Button
                id="rules-reference-trigger"
                onClick={() => setRulesReferenceOpen(layoutDispatch, !isRulesReferenceOpen)}
                startIcon={isRulesReferenceOpen ? undefined : <MenuBookIcon />}
                aria-label={isRulesReferenceOpen ? "Close rulebook" : undefined}
                aria-expanded={isRulesReferenceOpen}
                aria-controls="rules-reference"
                sx={{
                  textTransform: 'none',
                  color: 'primary.main',
                  minWidth: isRulesReferenceOpen ? 40 : undefined,
                  px: isRulesReferenceOpen ? 1 : undefined,
                  backgroundColor: showRulesReferenceHint ? 'action.selected' : 'transparent',
                  '&:hover': {
                    backgroundColor: 'rgba(47, 107, 255, 0.08)',
                  }
                }}
              >
                {isRulesReferenceOpen ? <MenuBookIcon /> : 'Rulebook'}
              </Button>
            </Tooltip>
          )}
          <ThemeToggle />
        </Box>
      </Toolbar>
    </AppBar>
  );
}

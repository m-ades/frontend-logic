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
import { Menu as MenuIcon, MenuBook as MenuBookIcon } from "@mui/icons-material";
import { ChevronRight } from "lucide-react";
import { Link as RouterLink, useLocation } from "react-router-dom";
import { useCoursesState } from "../../context/CoursesContext";
import ThemeToggle from "./ThemeToggle.jsx";
import {
  useLayoutDispatch,
  toggleSidebar,
  openRulesReference,
} from "../../context/LayoutContext.jsx";

const getBreadcrumbInfo = (pathname) => {
  if (pathname.startsWith("/instructor/assignment/")) {
    return { label: "Assignment", path: "/instructor/assignments" };
  }
  if (pathname.startsWith("/student/assignment/")) {
    return { label: "Assignment", path: "/student/assignments" };
  }
  if (pathname.startsWith("/student/worksheet/")) {
    return { label: "Worksheet", path: "/student/assignments" };
  }
  const routes = {
    "/instructor/dashboard": { label: "Dashboard", path: "/instructor/dashboard" },
    "/instructor/courses": { label: "All Courses", path: "/instructor/courses" },
    "/instructor/assignments": { label: "Assignments", path: "/instructor/assignments" },
    "/instructor/gradebook": { label: "Gradebook", path: "/instructor/gradebook" },
    "/instructor/controls": { label: "Course Controls", path: "/instructor/controls" },
    "/instructor/contact": { label: "Contact", path: "/instructor/contact" },
    "/instructor/assignment-builder": { label: "Assignments", path: "/instructor/assignments" },
    "/instructor/roster": { label: "Roster", path: "/instructor/roster" },
    "/instructor/profile": { label: "Profile & Preferences", path: "/instructor/profile" },
    "/instructor/practice": { label: "Practice", path: "/instructor/practice" },
    "/student/dashboard": { label: "Dashboard", path: "/student/dashboard" },
    "/student/courses": { label: "My Courses", path: "/student/courses" },
    "/student/assignments": { label: "Assignments", path: "/student/assignments" },
    "/student/grades": { label: "Grades", path: "/student/grades" },
    "/student/practice": { label: "Practice", path: "/student/practice" },
    "/student/contact": { label: "Contact", path: "/student/contact" },
    "/student/profile": { label: "Profile & Preferences", path: "/student/profile" },
  };

  return routes[pathname] || { label: "Dashboard", path: "/student/dashboard" };
};

const getCourseListPath = (pathname) => {
  if (pathname.startsWith("/instructor/")) {
    return "/instructor/courses";
  }
  return "/student/courses";
};

export default function Header() {
  const location = useLocation();
  const { courses, activeCourseId } = useCoursesState();
  const layoutDispatch = useLayoutDispatch();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const activeCourse = courses.find((c) => c.id === activeCourseId);
  const pageInfo = getBreadcrumbInfo(location.pathname);
  const courseListPath = getCourseListPath(location.pathname);

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
          sx={{ flexGrow: 1, display: "flex", alignItems: "center", gap: 1 }}
        >
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
                to={courseListPath}
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Button
            onClick={() => openRulesReference(layoutDispatch)}
            startIcon={<MenuBookIcon />}
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

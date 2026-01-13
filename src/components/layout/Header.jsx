import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Breadcrumbs,
  Link,
} from "@mui/material";
import { ChevronRight } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useCoursesState } from "../../context/CoursesContext";
import ThemeToggle from "./ThemeToggle.jsx";

// Map routes to readable page names
const getPageName = (pathname) => {
  if (pathname.startsWith("/student/assignment/")) {
    return "Assignment";
  }
  if (pathname.startsWith("/student/worksheet/")) {
    return "Worksheet";
  }
  const routes = {
    "/instructor/dashboard": "Dashboard",
    "/instructor/courses": "All Courses",
    "/instructor/assignments": "Assignments",
    "/instructor/gradebook": "Gradebook",
    "/instructor/controls": "Course Controls",
    "/instructor/contact": "Contact",
    "/instructor/assignment-builder": "Assignment Builder",
    "/instructor/roster": "Roster",
    "/instructor/profile": "Profile & Preferences",
    "/instructor/practice": "Practice",
    "/student/dashboard": "Dashboard",
    "/student/courses": "My Courses",
    "/student/assignments": "Assignments",
    "/student/grades": "Grades",
    "/student/practice": "Practice",
    "/student/contact": "Contact",
    "/student/profile": "Profile & Preferences",
  };

  return routes[pathname] || "Dashboard";
};

export default function Header() {
  const location = useLocation();
  const { courses, activeCourseId } = useCoursesState();

  const activeCourse = courses.find((c) => c.id === activeCourseId);
  const pageName = getPageName(location.pathname);

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
              <Typography
                variant="body1"
                sx={{
                  fontWeight: 600,
                  color: "text.primary",
                }}
              >
                {activeCourse.code}
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: "text.secondary",
                }}
              >
                {pageName}
              </Typography>
            </Breadcrumbs>
          ) : (
            <Typography
              variant="body1"
              sx={{
                fontWeight: 600,
                color: "text.primary",
              }}
            >
              {pageName}
            </Typography>
          )}
        </Box>
        <ThemeToggle />
      </Toolbar>
    </AppBar>
  );
}

import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Menu,
  MenuItem,
  Typography,
  Divider,
  ListItemIcon,
  ListItemText,
  Tooltip,
} from "@mui/material";
import {
  ExpandMore as ExpandMoreIcon,
  School as SchoolIcon,
  GridView as GridViewIcon,
  Circle as CircleIcon,
  CheckCircle as CheckCircleIcon,
} from "@mui/icons-material";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuthState } from "../../context/AuthContext";
import { isInstructorRole } from "../../utils/auth.js";
import {
  useCoursesState,
  useCoursesDispatch,
  setActiveCourse,
} from "../../context/CoursesContext";

export default function CourseSelector({ isSidebarOpened }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const { user } = useAuthState();
  const { courses, activeCourseId } = useCoursesState();
  const dispatch = useCoursesDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const isInstructor = location.pathname.startsWith("/instructor")
    ? true
    : location.pathname.startsWith("/student")
    ? false
    : isInstructorRole(user?.role);
  const coursesPath = isInstructor ? "/instructor/courses" : "/student/courses";
  const dashboardPath = isInstructor
    ? "/instructor/dashboard"
    : "/student/dashboard";

  const activeCourse = courses.find((c) => c.id === activeCourseId);
  const currentCourses = courses.filter((c) => c.status === "current");
  const pastCourses = courses.filter((c) => c.status === "past");

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  useEffect(() => {
    if (anchorEl && !anchorEl.isConnected) {
      setAnchorEl(null);
    }
  }, [anchorEl]);

  useEffect(() => {
    setAnchorEl(null);
  }, [isSidebarOpened]);

  const handleSelectCourse = (courseId) => {
    setActiveCourse(dispatch, courseId);
    handleClose();

    // Navigate to dashboard when selecting a course
    // Only navigate if we're not already on the courses page
    if (!location.pathname.includes("/dashboard")) {
      navigate(dashboardPath);
    }
  };

  const handleViewAllCourses = () => {
    navigate(coursesPath);
    handleClose();
  };

  // Collapsed sidebar view (icon only)
  if (!isSidebarOpened) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          py: 2,
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        <Tooltip
          title={activeCourse?.code || "Select Course"}
          placement="right"
        >
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              backgroundColor: activeCourse?.color || "primary.main",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "all 0.2s ease",
              "&:hover": {
                transform: "scale(1.1)",
                boxShadow: 2,
              },
            }}
            onClick={handleClick}
          >
            <SchoolIcon sx={{ color: "white", fontSize: 20 }} />
          </Box>
        </Tooltip>

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleClose}
          anchorOrigin={{ vertical: "top", horizontal: "right" }}
          transformOrigin={{ vertical: "top", horizontal: "left" }}
          slotProps={{
            paper: {
              sx: {
                minWidth: 280,
                maxWidth: 320,
              },
            },
          }}
        >
          <MenuItem
            onClick={handleViewAllCourses}
            sx={{
              py: 1.5,
              borderBottom: "1px solid",
              borderColor: "divider",
            }}
          >
            <ListItemIcon>
              <GridViewIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>View All Courses</ListItemText>
          </MenuItem>

          {currentCourses.length > 0 && (
            <>
              <Typography
                variant="overline"
                sx={{
                  px: 2,
                  pt: 1.5,
                  pb: 0.5,
                  fontSize: "0.7rem",
                  fontWeight: 600,
                  color: "text.secondary",
                  display: "block",
                }}
              >
                Current Courses
              </Typography>
              {currentCourses.map((course) => (
                <MenuItem
                  key={course.id}
                  onClick={() => handleSelectCourse(course.id)}
                  selected={course.id === activeCourseId}
                  sx={{
                    py: 1.5,
                    "&.Mui-selected": {
                      backgroundColor: "action.selected",
                      "&:hover": {
                        backgroundColor: "action.hover",
                      },
                    },
                  }}
                >
                  <ListItemIcon>
                    {course.id === activeCourseId ? (
                      <CheckCircleIcon
                        sx={{ fontSize: 18, color: course.color }}
                      />
                    ) : (
                      <CircleIcon sx={{ fontSize: 12, color: course.color }} />
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary={course.code}
                    secondary={course.semester}
                    slotProps={{
                      primary: {
                        fontSize: "0.875rem",
                        fontWeight: course.id === activeCourseId ? 600 : 400,
                      },
                      secondary: { fontSize: "0.75rem" },
                    }}
                  />
                </MenuItem>
              ))}
            </>
          )}

          {pastCourses.length > 0 && (
            <>
              <Divider sx={{ my: 1 }} />
              <Typography
                variant="overline"
                sx={{
                  px: 2,
                  pt: 1,
                  pb: 0.5,
                  fontSize: "0.7rem",
                  fontWeight: 600,
                  color: "text.secondary",
                  display: "block",
                }}
              >
                Past Courses
              </Typography>
              {pastCourses.map((course) => (
                <MenuItem
                  key={course.id}
                  onClick={() => handleSelectCourse(course.id)}
                  selected={course.id === activeCourseId}
                  sx={{
                    py: 1.5,
                    opacity: 0.7,
                    "&.Mui-selected": {
                      backgroundColor: "action.selected",
                      opacity: 1,
                      "&:hover": {
                        backgroundColor: "action.hover",
                      },
                    },
                    "&:hover": {
                      opacity: 1,
                    },
                  }}
                >
                  <ListItemIcon>
                    {course.id === activeCourseId ? (
                      <CheckCircleIcon
                        sx={{ fontSize: 18, color: course.color }}
                      />
                    ) : (
                      <CircleIcon sx={{ fontSize: 12, color: course.color }} />
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary={course.code}
                    secondary={course.semester}
                    slotProps={{
                      primary: {
                        fontSize: "0.875rem",
                        fontWeight: course.id === activeCourseId ? 600 : 400,
                      },
                      secondary: { fontSize: "0.75rem" },
                    }}
                  />
                </MenuItem>
              ))}
            </>
          )}

          {courses.length === 0 && (
            <Box sx={{ px: 2, py: 3, textAlign: "center" }}>
              <Typography variant="body2" color="text.secondary">
                No courses available
              </Typography>
            </Box>
          )}
        </Menu>
      </Box>
    );
  }

  // Expanded sidebar view
  return (
    <Box
      sx={{
        px: 2,
        py: 2,
        borderBottom: "1px solid",
        borderColor: "divider",
      }}
    >
      {/* Course selector button */}
      <Button
        fullWidth
        onClick={handleClick}
        endIcon={<ExpandMoreIcon />}
        sx={{
          justifyContent: "space-between",
          textAlign: "left",
          py: 1.5,
          px: 2,
          borderRadius: 2,
          backgroundColor: "action.hover",
          textTransform: "none",
          transition: "all 0.2s ease",
          "&:hover": {
            backgroundColor: "action.selected",
            transform: "translateY(-1px)",
            boxShadow: 1,
          },
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            overflow: "hidden",
            minWidth: 0,
          }}
        >
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              backgroundColor: activeCourse?.color || "primary.main",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: 1,
            }}
          >
            <SchoolIcon sx={{ color: "white", fontSize: 18 }} />
          </Box>
          <Box sx={{ overflow: "hidden", minWidth: 0 }}>
            <Typography
              variant="body2"
              sx={{
                fontWeight: 600,
                color: "text.primary",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {activeCourse?.code || "Select Course"}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                display: "block",
              }}
            >
              {activeCourse?.semester || "No course selected"}
            </Typography>
          </Box>
        </Box>
      </Button>

      {/* View all courses button */}
      <Button
        fullWidth
        startIcon={<GridViewIcon />}
        onClick={handleViewAllCourses}
        sx={{
          mt: 1,
          justifyContent: "flex-start",
          textTransform: "none",
          color: "text.secondary",
          fontSize: "0.875rem",
          py: 1,
          "&:hover": {
            backgroundColor: "action.hover",
            color: "primary.main",
          },
        }}
      >
        View All Courses
      </Button>

      {/* Course selection menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        slotProps={{
          paper: {
            sx: {
              minWidth: 280,
              maxWidth: 320,
              mt: 0.5,
            },
          },
        }}
      >
        {currentCourses.length > 0 && (
          <>
            <Typography
              variant="overline"
              sx={{
                px: 2,
                pt: 1.5,
                pb: 0.5,
                fontSize: "0.7rem",
                fontWeight: 600,
                color: "text.secondary",
                display: "block",
              }}
            >
              Current Courses
            </Typography>
            {currentCourses.map((course) => (
              <MenuItem
                key={course.id}
                onClick={() => handleSelectCourse(course.id)}
                selected={course.id === activeCourseId}
                sx={{
                  py: 1.5,
                  "&.Mui-selected": {
                    backgroundColor: "action.selected",
                    "&:hover": {
                      backgroundColor: "action.hover",
                    },
                  },
                }}
              >
                <ListItemIcon>
                  {course.id === activeCourseId ? (
                    <CheckCircleIcon
                      sx={{ fontSize: 18, color: course.color }}
                    />
                  ) : (
                    <CircleIcon sx={{ fontSize: 12, color: course.color }} />
                  )}
                </ListItemIcon>
                <ListItemText
                  primary={course.code}
                  secondary={course.semester}
                  slotProps={{
                    primary: {
                      fontSize: "0.875rem",
                      fontWeight: course.id === activeCourseId ? 600 : 400,
                    },
                    secondary: { fontSize: "0.75rem" },
                  }}
                />
              </MenuItem>
            ))}
          </>
        )}

        {pastCourses.length > 0 && (
          <>
            <Divider sx={{ my: 1 }} />
            <Typography
              variant="overline"
              sx={{
                px: 2,
                pt: 1,
                pb: 0.5,
                fontSize: "0.7rem",
                fontWeight: 600,
                color: "text.secondary",
                display: "block",
              }}
            >
              Past Courses
            </Typography>
            {pastCourses.map((course) => (
              <MenuItem
                key={course.id}
                onClick={() => handleSelectCourse(course.id)}
                selected={course.id === activeCourseId}
                sx={{
                  py: 1.5,
                  opacity: 0.7,
                  "&.Mui-selected": {
                    backgroundColor: "action.selected",
                    opacity: 1,
                    "&:hover": {
                      backgroundColor: "action.hover",
                    },
                  },
                  "&:hover": {
                    opacity: 1,
                  },
                }}
              >
                <ListItemIcon>
                  {course.id === activeCourseId ? (
                    <CheckCircleIcon
                      sx={{ fontSize: 18, color: course.color }}
                    />
                  ) : (
                    <CircleIcon sx={{ fontSize: 12, color: course.color }} />
                  )}
                </ListItemIcon>
                <ListItemText
                  primary={course.code}
                  secondary={course.semester}
                  slotProps={{
                    primary: {
                      fontSize: "0.875rem",
                      fontWeight: course.id === activeCourseId ? 600 : 400,
                    },
                    secondary: { fontSize: "0.75rem" },
                  }}
                />
              </MenuItem>
            ))}
          </>
        )}

        {courses.length === 0 && (
          <Box sx={{ px: 2, py: 3, textAlign: "center" }}>
            <Typography variant="body2" color="text.secondary">
              No courses available
            </Typography>
          </Box>
        )}
      </Menu>
    </Box>
  );
}

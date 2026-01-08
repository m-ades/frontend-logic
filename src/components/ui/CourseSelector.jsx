import { useState } from "react";
import {
  Box,
  Button,
  Menu,
  MenuItem,
  Typography,
  Chip,
  Divider,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import {
  ExpandMore as ExpandMoreIcon,
  School as SchoolIcon,
  GridView as GridViewIcon,
  Circle as CircleIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import {
  useCoursesState,
  useCoursesDispatch,
  setActiveCourse,
} from "../../context/CoursesContext";

export default function CourseSelector({ isSidebarOpened }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const { courses, activeCourseId } = useCoursesState();
  const dispatch = useCoursesDispatch();
  const navigate = useNavigate();

  const activeCourse = courses.find((c) => c.id === activeCourseId);
  const currentCourses = courses.filter((c) => c.status === "current");
  const pastCourses = courses.filter((c) => c.status === "past");

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleSelectCourse = (courseId) => {
    setActiveCourse(dispatch, courseId);
    handleClose();
  };

  const handleViewAllCourses = () => {
    navigate("/instructor/courses");
    handleClose();
  };

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
          }}
          onClick={handleClick}
        >
          <SchoolIcon sx={{ color: "white", fontSize: 20 }} />
        </Box>
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleClose}
          anchorOrigin={{ vertical: "top", horizontal: "right" }}
          transformOrigin={{ vertical: "top", horizontal: "left" }}
          PaperProps={{
            sx: { minWidth: 280 },
          }}
        >
          <MenuItem onClick={handleViewAllCourses}>
            <ListItemIcon>
              <GridViewIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>All Courses</ListItemText>
          </MenuItem>
          <Divider />
          {currentCourses.length > 0 && (
            <>
              <Typography
                variant="overline"
                sx={{
                  px: 2,
                  pt: 1,
                  pb: 0.5,
                  fontSize: "0.7rem",
                  color: "text.secondary",
                }}
              >
                Current
              </Typography>
              {currentCourses.map((course) => (
                <MenuItem
                  key={course.id}
                  onClick={() => handleSelectCourse(course.id)}
                  selected={course.id === activeCourseId}
                >
                  <ListItemIcon>
                    <CircleIcon sx={{ fontSize: 12, color: course.color }} />
                  </ListItemIcon>
                  <ListItemText
                    primary={course.code}
                    secondary={course.semester}
                    primaryTypographyProps={{ fontSize: "0.875rem" }}
                    secondaryTypographyProps={{ fontSize: "0.75rem" }}
                  />
                </MenuItem>
              ))}
            </>
          )}
          {pastCourses.length > 0 && (
            <>
              <Typography
                variant="overline"
                sx={{
                  px: 2,
                  pt: 1,
                  pb: 0.5,
                  fontSize: "0.7rem",
                  color: "text.secondary",
                }}
              >
                Past
              </Typography>
              {pastCourses.map((course) => (
                <MenuItem
                  key={course.id}
                  onClick={() => handleSelectCourse(course.id)}
                  selected={course.id === activeCourseId}
                >
                  <ListItemIcon>
                    <CircleIcon sx={{ fontSize: 12, color: course.color }} />
                  </ListItemIcon>
                  <ListItemText
                    primary={course.code}
                    secondary={course.semester}
                    primaryTypographyProps={{ fontSize: "0.875rem" }}
                    secondaryTypographyProps={{ fontSize: "0.75rem" }}
                  />
                </MenuItem>
              ))}
            </>
          )}
        </Menu>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        px: 2,
        py: 2,
        borderBottom: "1px solid",
        borderColor: "divider",
      }}
    >
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
          backgroundColor: "background.light",
          textTransform: "none",
          "&:hover": {
            backgroundColor: "action.hover",
          },
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            overflow: "hidden",
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
            }}
          >
            <SchoolIcon sx={{ color: "white", fontSize: 18 }} />
          </Box>
          <Box sx={{ overflow: "hidden" }}>
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
            <Typography variant="caption" color="text.secondary">
              {activeCourse?.semester || "No course selected"}
            </Typography>
          </Box>
        </Box>
      </Button>

      <Button
        fullWidth
        startIcon={<GridViewIcon />}
        onClick={handleViewAllCourses}
        sx={{
          mt: 1,
          justifyContent: "flex-start",
          textTransform: "none",
          color: "text.secondary",
          "&:hover": {
            backgroundColor: "action.hover",
          },
        }}
      >
        All Courses
      </Button>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        PaperProps={{
          sx: { minWidth: 280 },
        }}
      >
        {currentCourses.length > 0 && (
          <>
            <Typography
              variant="overline"
              sx={{
                px: 2,
                pt: 1,
                pb: 0.5,
                fontSize: "0.7rem",
                color: "text.secondary",
              }}
            >
              Current Courses
            </Typography>
            {currentCourses.map((course) => (
              <MenuItem
                key={course.id}
                onClick={() => handleSelectCourse(course.id)}
                selected={course.id === activeCourseId}
              >
                <ListItemIcon>
                  <CircleIcon sx={{ fontSize: 12, color: course.color }} />
                </ListItemIcon>
                <ListItemText
                  primary={course.code}
                  secondary={course.semester}
                  primaryTypographyProps={{ fontSize: "0.875rem" }}
                  secondaryTypographyProps={{ fontSize: "0.75rem" }}
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
                color: "text.secondary",
              }}
            >
              Past Courses
            </Typography>
            {pastCourses.map((course) => (
              <MenuItem
                key={course.id}
                onClick={() => handleSelectCourse(course.id)}
                selected={course.id === activeCourseId}
              >
                <ListItemIcon>
                  <CircleIcon sx={{ fontSize: 12, color: course.color }} />
                </ListItemIcon>
                <ListItemText
                  primary={course.code}
                  secondary={course.semester}
                  primaryTypographyProps={{ fontSize: "0.875rem" }}
                  secondaryTypographyProps={{ fontSize: "0.75rem" }}
                />
              </MenuItem>
            ))}
          </>
        )}
      </Menu>
    </Box>
  );
}

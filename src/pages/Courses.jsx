import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  Chip,
  Stack,
  Avatar,
  Skeleton,
  Alert,
  LinearProgress,
} from "@mui/material";
import {
  School as SchoolIcon,
  People as PeopleIcon,
  Person as PersonIcon,
  CalendarMonth as CalendarIcon,
  TrendingUp as TrendingUpIcon,
  CheckCircle as CheckCircleIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useAuthState } from "../context/AuthContext";
import {
  useCoursesState,
  useCoursesDispatch,
  setActiveCourse,
  initializeCourses,
} from "../context/CoursesContext";

export default function Courses() {
  const { user } = useAuthState();
  const { courses, loading, error, initialized } = useCoursesState();
  const dispatch = useCoursesDispatch();
  const navigate = useNavigate();

  const isInstructor = user?.role === "instructor";
  const dashboardPath = isInstructor
    ? "/instructor/dashboard"
    : "/student/dashboard";

  useEffect(() => {
    if (!initialized) {
      initializeCourses(dispatch);
    }
  }, [initialized, dispatch]);

  const currentCourses = courses.filter((c) => c.status === "current");
  const pastCourses = courses.filter((c) => c.status === "past");

  const handleSelectCourse = (courseId) => {
    setActiveCourse(dispatch, courseId);
    navigate(dashboardPath);
  };

  // Loading skeleton
  const CourseCardSkeleton = () => (
    <Card sx={{ height: "100%" }}>
      <CardContent>
        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2, mb: 2 }}>
          <Skeleton variant="circular" width={56} height={56} />
          <Box sx={{ flexGrow: 1 }}>
            <Skeleton variant="text" width="60%" height={32} />
            <Skeleton variant="text" width="80%" />
            <Skeleton variant="rounded" width={60} height={24} sx={{ mt: 1 }} />
          </Box>
        </Box>
        <Stack spacing={1.5} sx={{ mt: 3 }}>
          <Skeleton variant="text" width="70%" />
          <Skeleton variant="text" width="50%" />
        </Stack>
      </CardContent>
    </Card>
  );

  const CourseCard = ({ course }) => {
    // Role-specific data
    const studentCount = course.studentCount || course.students || 0;
    const statusLabel = isInstructor
      ? course.status === "current"
        ? "Active"
        : "Archived"
      : course.status === "current"
      ? "Enrolled"
      : "Completed";

    return (
      <Card
        sx={{
          height: "100%",
          transition: "all 0.3s ease",
          position: "relative",
          overflow: "visible",
          "&:hover": {
            transform: "translateY(-4px)",
            boxShadow: 6,
          },
        }}
      >
        <CardActionArea
          onClick={() => handleSelectCourse(course.id)}
          sx={{ height: "100%", p: 0 }}
        >
          {/* Color accent bar */}
          <Box
            sx={{
              height: 4,
              width: "100%",
              backgroundColor: course.color || "#1976d2",
            }}
          />

          <CardContent sx={{ pt: 2.5 }}>
            <Box
              sx={{ display: "flex", alignItems: "flex-start", gap: 2, mb: 2 }}
            >
              <Avatar
                sx={{
                  width: 56,
                  height: 56,
                  backgroundColor: course.color || "#1976d2",
                  boxShadow: 2,
                }}
              >
                <SchoolIcon sx={{ fontSize: 32 }} />
              </Avatar>
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 600,
                    mb: 0.5,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {course.code}
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    mb: 1,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {course.name}
                </Typography>
                <Chip
                  label={statusLabel}
                  size="small"
                  color={course.status === "current" ? "success" : "default"}
                  icon={
                    course.status === "past" && !isInstructor ? (
                      <CheckCircleIcon />
                    ) : undefined
                  }
                  sx={{
                    fontSize: "0.75rem",
                    fontWeight: 500,
                  }}
                />
              </Box>
            </Box>

            <Stack spacing={1.5} sx={{ mt: 3 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <CalendarIcon
                  sx={{
                    fontSize: 18,
                    color: "text.secondary",
                    flexShrink: 0,
                  }}
                />
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {course.semester}
                </Typography>
              </Box>

              {/* Role-specific second row */}
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                {isInstructor ? (
                  <>
                    <PeopleIcon
                      sx={{
                        fontSize: 18,
                        color: "text.secondary",
                        flexShrink: 0,
                      }}
                    />
                    <Typography variant="body2" color="text.secondary">
                      {studentCount}{" "}
                      {studentCount === 1 ? "student" : "students"}
                    </Typography>
                  </>
                ) : (
                  <>
                    <PersonIcon
                      sx={{
                        fontSize: 18,
                        color: "text.secondary",
                        flexShrink: 0,
                      }}
                    />
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {course.instructor}
                    </Typography>
                  </>
                )}
              </Box>
            </Stack>
          </CardContent>
        </CardActionArea>
      </Card>
    );
  };

  // Error state
  if (error) {
    return (
      <Box>
        <Typography variant="h4" sx={{ mb: 4, fontWeight: 600 }}>
          My Courses
        </Typography>
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          action={
            <Typography
              variant="button"
              sx={{ cursor: "pointer", textDecoration: "underline" }}
              onClick={() => initializeCourses(dispatch)}
            >
              Retry
            </Typography>
          }
        >
          Failed to load courses: {error}
        </Alert>
      </Box>
    );
  }

  // Role-specific text
  const currentLabel = isInstructor ? "Active Courses" : "Current Enrollment";
  const pastLabel = isInstructor ? "Archived Courses" : "Completed Courses";
  const currentIcon = isInstructor ? TrendingUpIcon : SchoolIcon;
  const CurrentIcon = currentIcon;
  const summaryText = isInstructor
    ? `${currentCourses.length} active • ${pastCourses.length} archived`
    : `${currentCourses.length} enrolled • ${pastCourses.length} completed`;
  const emptyMessage = isInstructor
    ? "Courses will appear here when they are assigned to you. Contact your administrator if you believe this is an error."
    : "You haven't enrolled in any courses yet. Check with your advisor or visit the course catalog to get started.";

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
          My Courses
        </Typography>
        {!loading && courses.length > 0 && (
          <Typography variant="body2" color="text.secondary">
            {summaryText}
          </Typography>
        )}
      </Box>

      {/* Loading progress bar */}
      {loading && <LinearProgress sx={{ mb: 3 }} />}

      {/* Loading state - show skeletons */}
      {loading && !initialized && (
        <Grid container spacing={3}>
          {[1, 2, 3].map((i) => (
            <Grid item xs={12} sm={6} md={4} key={i}>
              <CourseCardSkeleton />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Loaded state */}
      {!loading && initialized && (
        <>
          {/* Current Courses */}
          {currentCourses.length > 0 && (
            <Box sx={{ mb: 5 }}>
              <Box
                sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}
              >
                <CurrentIcon
                  sx={{
                    color: isInstructor ? "success.main" : "primary.main",
                    fontSize: 20,
                  }}
                />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {currentLabel}
                </Typography>
                <Chip
                  label={currentCourses.length}
                  size="small"
                  color={isInstructor ? "success" : "primary"}
                  sx={{ fontWeight: 600 }}
                />
              </Box>
              <Grid container spacing={3}>
                {currentCourses.map((course) => (
                  <Grid item xs={12} sm={6} md={4} key={course.id}>
                    <CourseCard course={course} />
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}

          {/* Past Courses */}
          {pastCourses.length > 0 && (
            <Box>
              <Box
                sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}
              >
                <CheckCircleIcon
                  sx={{ color: "text.secondary", fontSize: 20 }}
                />
                <Typography
                  variant="h6"
                  sx={{ fontWeight: 600, color: "text.secondary" }}
                >
                  {pastLabel}
                </Typography>
              </Box>
              <Grid container spacing={3}>
                {pastCourses.map((course) => (
                  <Grid item xs={12} sm={6} md={4} key={course.id}>
                    <CourseCard course={course} />
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}

          {/* Empty state */}
          {courses.length === 0 && (
            <Box
              sx={{
                textAlign: "center",
                py: 12,
                px: 3,
              }}
            >
              <Box
                sx={{
                  display: "inline-flex",
                  p: 3,
                  borderRadius: "50%",
                  backgroundColor: "action.hover",
                  mb: 3,
                }}
              >
                <SchoolIcon
                  sx={{
                    fontSize: 64,
                    color: "text.secondary",
                    opacity: 0.5,
                  }}
                />
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
                No courses yet
              </Typography>
              <Typography
                variant="body1"
                color="text.secondary"
                sx={{ maxWidth: 400, mx: "auto" }}
              >
                {emptyMessage}
              </Typography>
            </Box>
          )}
        </>
      )}
    </Box>
  );
}

import { Box, Grid, Alert, LinearProgress, Typography } from "@mui/material";
import {
  TrendingUp as TrendingUpIcon,
  School as SchoolIcon,
  CheckCircle as CheckCircleIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuthState } from "../context/AuthContext";
import {
  useCoursesState,
  useCoursesDispatch,
  setActiveCourse,
  initializeCourses,
  addNewCourse,
} from "../context/CoursesContext";
import CreateCourseDialog from "../components/ui/courses/CreateCourseDialog";
import CoursesHeader from "../components/ui/courses/CoursesHeader";
import CoursesSection from "../components/ui/courses/CoursesSection";
import CoursesEmptyState from "../components/ui/courses/CoursesEmptyState";
import CourseCardSkeleton from "../components/ui/courses/CourseCardSkeleton";

export default function Courses() {
  const { user } = useAuthState();
  const { courses, loading, error, initialized } = useCoursesState();
  const dispatch = useCoursesDispatch();
  const navigate = useNavigate();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

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

  const handleCreateCourse = async (courseData) => {
    try {
      await addNewCourse(dispatch, courseData);
      navigate(dashboardPath);
    } catch (error) {
      console.error("Error creating course:", error);
    }
  };

  const handleOpenCreateDialog = () => {
    setCreateDialogOpen(true);
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

  return (
    <Box>
      {/* Header */}
      <CoursesHeader
        isInstructor={isInstructor}
        currentCount={currentCourses.length}
        pastCount={pastCourses.length}
        loading={loading}
        onCreateCourse={handleOpenCreateDialog}
      />

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
          <CoursesSection
            title={isInstructor ? "Active Courses" : "Current Enrollment"}
            courses={currentCourses}
            icon={isInstructor ? TrendingUpIcon : SchoolIcon}
            iconColor={isInstructor ? "success.main" : "primary.main"}
            chipColor={isInstructor ? "success" : "primary"}
            isInstructor={isInstructor}
            onSelectCourse={handleSelectCourse}
          />

          {/* Past Courses */}
          <CoursesSection
            title={isInstructor ? "Archived Courses" : "Completed Courses"}
            courses={pastCourses}
            icon={CheckCircleIcon}
            iconColor="text.secondary"
            chipColor="default"
            isInstructor={isInstructor}
            onSelectCourse={handleSelectCourse}
          />

          {/* Empty state */}
          {courses.length === 0 && (
            <CoursesEmptyState
              isInstructor={isInstructor}
              onCreateCourse={handleOpenCreateDialog}
            />
          )}
        </>
      )}

      {/* Create Course Dialog */}
      <CreateCourseDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onSubmit={handleCreateCourse}
      />
    </Box>
  );
}

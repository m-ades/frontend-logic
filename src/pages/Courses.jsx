import { Box, Alert, LinearProgress, Typography } from "@mui/material";
import Grid from "@mui/material/Grid";
import {
  TrendingUp as TrendingUpIcon,
  School as SchoolIcon,
  CheckCircle as CheckCircleIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import CreateCourseDialog from "../components/ui/courses/CreateCourseDialog";
import CoursesHeader from "../components/ui/courses/CoursesHeader";
import CoursesSection from "../components/ui/courses/CoursesSection";
import CoursesEmptyState from "../components/ui/courses/CoursesEmptyState";
import CourseCardSkeleton from "../components/ui/courses/CourseCardSkeleton";
import { useAppRuntime } from "../hooks/useAppRuntime.js";

export default function Courses() {
  const {
    courses: visibleCourses,
    isSandbox: sandbox,
    isInstructor,
    dashboardPath,
    courseState,
    courseActions,
  } = useAppRuntime();
  const { loading, error, initialized } = courseState;
  const navigate = useNavigate();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const allowCreateCourse = !sandbox || isInstructor;

  useEffect(() => {
    if (!sandbox && !initialized) {
      courseActions.initializeCourses?.();
    }
  }, [sandbox, initialized, courseActions]);

  const currentCourses = visibleCourses.filter((c) => c.status === "current");
  const pastCourses = visibleCourses.filter((c) => c.status === "past");

  const handleSelectCourse = (courseId) => {
    courseActions.setActiveCourse?.(courseId);
    navigate(dashboardPath);
  };

  const handleCreateCourse = async (courseData) => {
    try {
      await courseActions.addNewCourse?.(courseData);
      navigate(dashboardPath);
    } catch (error) {
      console.error("Error creating course:", error);
    }
  };

  const handleOpenCreateDialog = () => {
    setCreateDialogOpen(true);
  };

  // Error state
  if (!sandbox && error) {
    return (
      <Box>
        <Typography variant="h4" component="h1" sx={{ mb: 4, fontWeight: 600 }}>
          My Courses
        </Typography>
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          action={
            <Typography
              variant="button"
              sx={{ cursor: "pointer", textDecoration: "underline" }}
              onClick={() => courseActions.initializeCourses?.()}
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
      {!sandbox && loading && <LinearProgress sx={{ mb: 3 }} />}

      {/* Loading state - show skeletons */}
      {!sandbox && loading && !initialized && (
        <Grid container spacing={3}>
          {[1, 2, 3].map((i) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={i}>
              <CourseCardSkeleton />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Loaded state */}
      {(sandbox || (!loading && initialized)) && (
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
          {visibleCourses.length === 0 && (
            <CoursesEmptyState
              isInstructor={isInstructor}
              onCreateCourse={handleOpenCreateDialog}
            />
          )}
        </>
      )}

      {/* Create Course Dialog */}
      {allowCreateCourse && (
        <CreateCourseDialog
          open={createDialogOpen}
          onClose={() => setCreateDialogOpen(false)}
          onSubmit={handleCreateCourse}
        />
      )}
    </Box>
  );
}

import { useState } from "react";
import { Box, Typography, Button, Alert } from "@mui/material";
import { Save } from "lucide-react";
import CourseInfoSection from "../../components/ui/instructorControls/CourseInfoSection";
import GradingScaleSection from "../../components/ui/instructorControls/GradingScaleSection";
import LatePolicySection from "../../components/ui/instructorControls/LatePolicySection";
import CourseStatusSection from "../../components/ui/instructorControls/CourseStatusSection";
import { useAppRuntime } from "../../hooks/useAppRuntime.js";

export default function InstructorControls() {
  const { courseState, courseActions } = useAppRuntime();
  const { courses, activeCourseId } = courseState;

  const activeCourse = courses.find((c) => c.id === activeCourseId);

  const [showSuccess, setShowSuccess] = useState(false);
  const [errors, setErrors] = useState([]);

  const handleSave = async (settings) => {
    await courseActions.saveCourseSettings?.(activeCourseId, settings);

    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const handleArchiveCourse = async (courseId, archive = true) => {
    await courseActions.toggleArchiveCourse?.(courseId, archive);

    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const handleSaveAll = async () => {
    // This would combine all settings if needed
    // For now, each section saves independently
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  if (!activeCourse) {
    return (
      <Box>
        <Typography variant="h4" component="h1" sx={{ mb: 3, fontWeight: 600 }}>
          Controls
        </Typography>
        <Alert severity="info">No course selected</Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" component="h1" sx={{ mb: 3, fontWeight: 600 }}>
        Course Controls
      </Typography>

      {showSuccess && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Course settings saved successfully!
        </Alert>
      )}

      {errors.length > 0 && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography variant="subtitle2" fontWeight={600} mb={1}>
            Please fix the following errors:
          </Typography>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {errors.map((error, i) => (
              <li key={i}>{error}</li>
            ))}
          </ul>
        </Alert>
      )}

      {/* Course Information */}
      <CourseInfoSection course={activeCourse} onSave={handleSave} />

      {/* Grading Scale */}
      <GradingScaleSection
        course={activeCourse}
        onSave={handleSave}
        onError={setErrors}
      />

      {/* Late Submission Policy */}
      <LatePolicySection course={activeCourse} onSave={handleSave} />

      {/* Course Status */}
      <CourseStatusSection
        course={activeCourse}
        onArchive={handleArchiveCourse}
      />
    </Box>
  );
}

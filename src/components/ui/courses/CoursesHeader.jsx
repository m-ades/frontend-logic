import { Box, Typography, Button } from "@mui/material";
import { Add as AddIcon } from "@mui/icons-material";

export default function CoursesHeader({
  isInstructor,
  currentCount,
  pastCount,
  loading,
  onCreateCourse,
}) {
  const summaryText = isInstructor
    ? `${currentCount} active • ${pastCount} archived`
    : `${currentCount} enrolled`;

  return (
    <Box
      sx={{
        mb: 4,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
      }}
    >
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
          My Courses
        </Typography>
        {!loading && (currentCount > 0 || pastCount > 0) && (
          <Typography variant="body2" color="text.secondary">
            {summaryText}
          </Typography>
        )}
      </Box>

      {isInstructor && (
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={onCreateCourse}
          disableElevation
          sx={{ mt: 0.5 }}
        >
          Create Course
        </Button>
      )}
    </Box>
  );
}

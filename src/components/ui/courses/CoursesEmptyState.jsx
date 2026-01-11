import { Box, Typography, Button } from "@mui/material";
import { School as SchoolIcon, Add as AddIcon } from "@mui/icons-material";

export default function CoursesEmptyState({ isInstructor, onCreateCourse }) {
  const emptyMessage = isInstructor
    ? "Courses will appear here when they are assigned to you. Contact your administrator if you believe this is an error."
    : "You haven't enrolled in any courses yet. Check with your advisor or visit the course catalog to get started.";

  return (
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
        sx={{ maxWidth: 400, mx: "auto", mb: 3 }}
      >
        {emptyMessage}
      </Typography>
      {isInstructor && (
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={onCreateCourse}
          size="large"
        >
          Create Your First Course
        </Button>
      )}
    </Box>
  );
}

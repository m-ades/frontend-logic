import { Box, Typography, Chip, Grid } from "@mui/material";
import CourseCard from "./CourseCard";

export default function CoursesSection({
  title,
  courses,
  icon: Icon,
  iconColor,
  chipColor,
  isInstructor,
  onSelectCourse,
}) {
  if (courses.length === 0) return null;

  return (
    <Box sx={{ mb: 3 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
        <Icon sx={{ color: iconColor, fontSize: 20 }} />
        <Typography variant="h6" component="h2" sx={{ fontWeight: 600 }}>
          {title}
        </Typography>
        <Chip
          label={courses.length}
          size="small"
          color={chipColor}
          sx={{ fontWeight: 600 }}
        />
      </Box>
      <Grid container spacing={2}>
        {courses.map((course) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={course.id}>
            <CourseCard
              course={course}
              isInstructor={isInstructor}
              onSelect={onSelectCourse}
            />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

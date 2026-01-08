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
} from "@mui/material";
import {
  School as SchoolIcon,
  People as PeopleIcon,
  CalendarMonth as CalendarIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import {
  useCoursesState,
  useCoursesDispatch,
  setActiveCourse,
} from "../../context/CoursesContext";

export default function InstructorCourses() {
  const { courses } = useCoursesState();
  const dispatch = useCoursesDispatch();
  const navigate = useNavigate();

  const currentCourses = courses.filter((c) => c.status === "current");
  const pastCourses = courses.filter((c) => c.status === "past");

  const handleSelectCourse = (courseId) => {
    setActiveCourse(dispatch, courseId);
    navigate("/instructor/dashboard");
  };

  const CourseCard = ({ course }) => (
    <Card
      sx={{
        height: "100%",
        transition: "all 0.3s ease",
        "&:hover": {
          transform: "translateY(-4px)",
          boxShadow: 6,
        },
      }}
    >
      <CardActionArea
        onClick={() => handleSelectCourse(course.id)}
        sx={{ height: "100%" }}
      >
        <CardContent>
          <Box
            sx={{ display: "flex", alignItems: "flex-start", gap: 2, mb: 2 }}
          >
            <Avatar
              sx={{
                width: 56,
                height: 56,
                backgroundColor: course.color,
              }}
            >
              <SchoolIcon sx={{ fontSize: 32 }} />
            </Avatar>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                {course.code}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {course.name}
              </Typography>
              <Chip
                label={course.status === "current" ? "Active" : "Past"}
                size="small"
                color={course.status === "current" ? "success" : "default"}
                sx={{ fontSize: "0.75rem" }}
              />
            </Box>
          </Box>

          <Stack spacing={1.5} sx={{ mt: 3 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <CalendarIcon sx={{ fontSize: 18, color: "text.secondary" }} />
              <Typography variant="body2" color="text.secondary">
                {course.semester}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <PeopleIcon sx={{ fontSize: 18, color: "text.secondary" }} />
              <Typography variant="body2" color="text.secondary">
                {course.students} students
              </Typography>
            </Box>
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 4, fontWeight: 600 }}>
        My Courses
      </Typography>

      {currentCourses.length > 0 && (
        <Box sx={{ mb: 5 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            Current Courses
          </Typography>
          <Grid container spacing={3}>
            {currentCourses.map((course) => (
              <Grid item xs={12} sm={6} md={4} key={course.id}>
                <CourseCard course={course} />
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {pastCourses.length > 0 && (
        <Box>
          <Typography
            variant="h6"
            sx={{ mb: 2, fontWeight: 600, color: "text.secondary" }}
          >
            Past Courses
          </Typography>
          <Grid container spacing={3}>
            {pastCourses.map((course) => (
              <Grid item xs={12} sm={6} md={4} key={course.id}>
                <CourseCard course={course} />
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {courses.length === 0 && (
        <Box
          sx={{
            textAlign: "center",
            py: 8,
            color: "text.secondary",
          }}
        >
          <SchoolIcon sx={{ fontSize: 64, mb: 2, opacity: 0.5 }} />
          <Typography variant="h6">No courses found</Typography>
          <Typography variant="body2">
            Courses will appear here when they are assigned to you
          </Typography>
        </Box>
      )}
    </Box>
  );
}

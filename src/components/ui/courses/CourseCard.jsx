import {
  Card,
  CardContent,
  CardActionArea,
  Box,
  Typography,
  Chip,
  Stack,
  Avatar,
} from "@mui/material";
import {
  School as SchoolIcon,
  People as PeopleIcon,
  Person as PersonIcon,
  CalendarMonth as CalendarIcon,
  CheckCircle as CheckCircleIcon,
} from "@mui/icons-material";

export default function CourseCard({ course, isInstructor, onSelect }) {
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
        minWidth: "300px",
        maxWidth: "300px",
        display: "flex",
        flexDirection: "column",
        transition: "all 0.3s ease",
        position: "relative",
        overflow: "hidden",
        borderRadius: 2,
        "&:hover": {
          transform: "translateY(-4px)",
          boxShadow: 6,
        },
      }}
    >
      <CardActionArea
        onClick={() => onSelect(course.id)}
        sx={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "stretch",
          justifyContent: "flex-start",
          p: 0,
        }}
      >
        {/* Color accent bar */}
        <Box
          sx={{
            height: 4,
            width: "100%",
            backgroundColor: course.color || "#1976d2",
            flexShrink: 0,
          }}
        />

        <CardContent
          sx={{
            pt: 2.5,
            flexGrow: 1,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Top section - fixed height */}
          <Box
            sx={{
              display: "flex",
              alignItems: "flex-start",
              gap: 2,
              mb: 2,
            }}
          >
            <Avatar
              sx={{
                width: 56,
                height: 56,
                backgroundColor: course.color || "#1976d2",
                boxShadow: 2,
                flexShrink: 0,
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
                  lineHeight: 1.3,
                }}
              >
                {course.code}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  mb: 1,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  lineHeight: 1.4,
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

          {/* Bottom section - fixed height */}
          <Stack spacing={1.5} sx={{ mt: "auto" }}>
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
                    {studentCount} {studentCount === 1 ? "student" : "students"}
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
}

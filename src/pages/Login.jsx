import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import {
  Box,
  Button,
  Typography,
  Container,
  Card,
  CardContent,
  Stack,
} from "@mui/material";
import {
  School as StudentIcon,
  Person as InstructorIcon,
} from "@mui/icons-material";
import {
  useAuthState,
  useAuthDispatch,
  login,
  MOCK_USERS,
} from "../context/AuthContext";

export default function Login() {
  const navigate = useNavigate();
  const dispatch = useAuthDispatch();
  const { isAuthenticated, user, isLoading } = useAuthState();

  // Redirect if already logged in
  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      if (user.role === "instructor") {
        navigate("/instructor/courses", { replace: true });
      } else {
        navigate("/student/dashboard", { replace: true });
      }
    }
  }, [isAuthenticated, user, isLoading, navigate]);

  const handleStudentLogin = () => {
    login(dispatch, MOCK_USERS.student);
    navigate("/student/dashboard");
  };

  const handleInstructorLogin = () => {
    login(dispatch, MOCK_USERS.instructor);
    navigate("/instructor/courses");
  };

  // Don't render anything while checking auth state
  if (isLoading) {
    return null;
  }

  // Don't render login form if already authenticated (prevents flash during redirect)
  if (isAuthenticated) {
    return null;
  }

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Card sx={{ width: "100%" }}>
          <CardContent sx={{ p: 4 }}>
            <Typography
              variant="h4"
              align="center"
              gutterBottom
              sx={{ fontWeight: 600, mb: 1 }}
            >
              Development Login
            </Typography>
            <Typography
              variant="body1"
              align="center"
              color="text.secondary"
              sx={{ mb: 4 }}
            >
              PHILO/MATH/CSCI 275 Symbolic Logic
            </Typography>

            <Stack spacing={3}>
              <Button
                variant="contained"
                size="large"
                fullWidth
                startIcon={<StudentIcon />}
                onClick={handleStudentLogin}
                sx={{ py: 2 }}
              >
                Login as Student
              </Button>

              <Button
                variant="contained"
                size="large"
                fullWidth
                startIcon={<InstructorIcon />}
                onClick={handleInstructorLogin}
                sx={{ py: 2 }}
                color="secondary"
              >
                Login as Instructor
              </Button>
            </Stack>

            <Typography
              variant="caption"
              align="center"
              color="text.secondary"
              sx={{ mt: 3, display: "block" }}
            >
              Development mode - Click a button to assume a role
            </Typography>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
}

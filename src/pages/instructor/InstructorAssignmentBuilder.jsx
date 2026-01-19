import { Box, Typography, Button, Paper, Container, Chip } from "@mui/material";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Construction, Brain, FileEdit } from "lucide-react";

export default function AssignmentBuilder() {
  const navigate = useNavigate();
  const location = useLocation();

  // Get the assignment or practice ID from location state
  const { assignmentId, practiceId } = location.state || {};
  const isPractice = !!practiceId;
  const isEditing = !!(assignmentId || practiceId);

  const handleBack = () => {
    if (isPractice) {
      navigate("/instructor/practice");
    } else {
      navigate("/instructor/assignments");
    }
  };

  const getTitle = () => {
    if (isPractice) {
      return isEditing
        ? "Edit Practice Assignment"
        : "Create Practice Assignment";
    }
    return isEditing ? "Edit Assignment" : "Create Assignment";
  };

  const getDescription = () => {
    if (isPractice) {
      return "Create practice assignments that help students learn without grade pressure. Students can retake unlimited times and view solutions.";
    }
    return "Create graded assignments with custom questions, point values, and due dates.";
  };

  return (
    <Container maxWidth="md">
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "60vh",
          textAlign: "center",
        }}
      >
        <Paper
          elevation={2}
          sx={{
            p: 6,
            borderRadius: 3,
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 3,
          }}
        >
          <Box
            sx={{
              width: 120,
              height: 120,
              borderRadius: "50%",
              backgroundColor: isPractice ? "info.lighter" : "action.hover",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              mb: 2,
            }}
          >
            {isPractice ? (
              <Brain size={60} color={isPractice ? "#2196f3" : "#666"} />
            ) : (
              <FileEdit size={60} color="#666" />
            )}
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            {isPractice && (
              <Chip
                icon={<Brain size={16} />}
                label="Practice"
                color="info"
                variant="outlined"
              />
            )}
            {isEditing && (
              <Chip
                label={isPractice ? `ID: ${practiceId}` : `ID: ${assignmentId}`}
                variant="outlined"
                size="small"
              />
            )}
          </Box>

          <Typography variant="h3" fontWeight={700} gutterBottom>
            {getTitle()}
          </Typography>

          <Typography
            variant="h6"
            color="text.secondary"
            sx={{ maxWidth: 500, mb: 2 }}
          >
            The Assignment Builder is currently under development
          </Typography>

          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ maxWidth: 500 }}
          >
            {getDescription()}
          </Typography>

          <Box sx={{ mt: 4, display: "flex", gap: 2 }}>
            <Button
              variant="contained"
              size="large"
              startIcon={<ArrowLeft size={20} />}
              onClick={handleBack}
              sx={{ px: 4 }}
            >
              Back to {isPractice ? "Practice" : "Assignments"}
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
}

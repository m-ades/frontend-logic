import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Stack,
  Alert,
  IconButton,
  Box,
  Typography,
} from "@mui/material";
import { X, UserPlus } from "lucide-react";
// Match backend password policy and messaging in the UI.
import {
  generateStrongPassword,
  isStrongPassword,
  PASSWORD_POLICY_MESSAGE,
} from "../../utils/passwords.js";

export default function AddStudentDialog({ open, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
    // Clear error for this field
    if (errors[field]) {
      setErrors({ ...errors, [field]: null });
    }
    if (submitError) {
      setSubmitError("");
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.username.trim()) {
      newErrors.username = "Username is required";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";

    } else if (!isStrongPassword(formData.password)) {
      newErrors.password = PASSWORD_POLICY_MESSAGE;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // backend error payloads msg
  const getErrorMessage = (error) => {
    if (!error) return "Failed to add student.";
    if (typeof error === "string") return error;
    const message = error.message || String(error);
    if (!message) return "Failed to add student.";
    try {
      const parsed = JSON.parse(message);
      if (Array.isArray(parsed?.errors) && parsed.errors.length > 0) {
        return parsed.errors
          .map((entry) => entry?.msg || entry?.message)
          .filter(Boolean)
          .join(", ");
      }
      if (parsed?.message) return parsed.message;
    } catch {
      // ignore parse errors
    }
    return message;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setSubmitError("");
      await onSubmit(formData);
      handleClose();
    } catch (error) {
      setSubmitError(getErrorMessage(error));
    }
  };

  const handleClose = () => {
    setFormData({ username: "", password: "" });
    setErrors({});
    setSubmitError("");
    onClose();
  };

  const generatePassword = () => {
    handleChange("password", generateStrongPassword());
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <UserPlus size={24} />
            <Typography variant="h6" component="div" fontWeight={600}>
              Add Student to Course
            </Typography>
          </Box>
          <IconButton onClick={handleClose} size="small">
            <X size={20} />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          <Alert severity="info">
            A student account will be created with the information below. Make
            sure to share the password with the student securely.
          </Alert>
          {submitError && <Alert severity="error">{submitError}</Alert>}

          <TextField
            label="Username"
            fullWidth
            required
            value={formData.username}
            onChange={(e) => handleChange("username", e.target.value)}
            error={!!errors.username}
            helperText={errors.username || "e.g., johnsmith"}
            autoFocus
          />

          <Box>
            <Box sx={{ display: "flex", gap: 1 }}>
              <TextField
                label="Password"
                type="text"
                fullWidth
                required
                value={formData.password}
                onChange={(e) => handleChange("password", e.target.value)}
                error={!!errors.password}
                helperText={
                  errors.password ||
                  PASSWORD_POLICY_MESSAGE
                }
              />
              <Button
                variant="outlined"
                onClick={generatePassword}
                sx={{ minWidth: 120, mt: 0 }}
              >
                Generate
              </Button>
            </Box>
          </Box>

          {formData.password && (
            <Alert severity="warning">
              <Typography variant="body2" fontWeight={600} mb={0.5}>
                Important: Save this password
              </Typography>
              <Typography variant="body2">
                Make sure to securely share this password with the student. They
                can change it after logging in.
              </Typography>
            </Alert>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={handleClose}>Cancel</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={!formData.username || !formData.password}
          startIcon={<UserPlus size={18} />}
        >
          Add Student
        </Button>
      </DialogActions>
    </Dialog>
  );
}

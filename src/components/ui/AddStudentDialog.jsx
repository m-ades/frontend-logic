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

export default function AddStudentDialog({ open, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState({});

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
    // Clear error for this field
    if (errors[field]) {
      setErrors({ ...errors, [field]: null });
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    onSubmit(formData);
    handleClose();
  };

  const handleClose = () => {
    setFormData({ name: "", email: "", password: "" });
    setErrors({});
    onClose();
  };

  const generatePassword = () => {
    // Generate a random 8-character password
    const chars =
      "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$";
    let password = "";
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData({ ...formData, password });
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
            <Typography variant="h6" fontWeight={600}>
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

          <TextField
            label="Full Name"
            fullWidth
            required
            value={formData.name}
            onChange={(e) => handleChange("name", e.target.value)}
            error={!!errors.name}
            helperText={errors.name || "e.g., John Smith"}
            autoFocus
          />

          <TextField
            label="Email Address"
            type="email"
            fullWidth
            required
            value={formData.email}
            onChange={(e) => handleChange("email", e.target.value)}
            error={!!errors.email}
            helperText={
              errors.email || "This will be used for login and communications"
            }
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
                  "Student will use this to log in (minimum 6 characters)"
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
          disabled={!formData.name || !formData.email || !formData.password}
          startIcon={<UserPlus size={18} />}
        >
          Add Student
        </Button>
      </DialogActions>
    </Dialog>
  );
}

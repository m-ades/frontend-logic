import { useState, useEffect } from "react";
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
  Divider,
  Switch,
  FormControlLabel,
} from "@mui/material";
import { X, Save, RefreshCw } from "lucide-react";

export default function EditStudentDialog({
  open,
  onClose,
  onSubmit,
  student,
}) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    newPassword: "",
  });
  const [changePassword, setChangePassword] = useState(false);
  const [errors, setErrors] = useState({});

  // Reset form when dialog opens with new student
  useEffect(() => {
    if (open && student) {
      setFormData({
        name: student.name || "",
        email: student.email || "",
        newPassword: "",
      });
      setChangePassword(false);
      setErrors({});
    }
  }, [open, student]);

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

    if (changePassword) {
      if (!formData.newPassword) {
        newErrors.newPassword = "New password is required";
      } else if (formData.newPassword.length < 6) {
        newErrors.newPassword = "Password must be at least 6 characters";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    const updates = {
      name: formData.name,
      email: formData.email,
    };

    // Only include password if changing
    if (changePassword && formData.newPassword) {
      updates.password = formData.newPassword;
    }

    onSubmit(updates);
  };

  const handleClose = () => {
    setFormData({ name: "", email: "", newPassword: "" });
    setChangePassword(false);
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
    setFormData({ ...formData, newPassword: password });
  };

  if (!student) return null;

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
          <Typography variant="h6" fontWeight={600}>
            Edit Student Information
          </Typography>
          <IconButton onClick={handleClose} size="small">
            <X size={20} />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          <Alert severity="info">
            Update student's name, email, or reset their password.
          </Alert>

          <Typography
            variant="subtitle2"
            fontWeight={600}
            color="text.secondary"
          >
            Basic Information
          </Typography>

          <TextField
            label="Full Name"
            fullWidth
            required
            value={formData.name}
            onChange={(e) => handleChange("name", e.target.value)}
            error={!!errors.name}
            helperText={errors.name}
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
            helperText={errors.email || "Used for login and communications"}
          />

          <Divider />

          <Typography
            variant="subtitle2"
            fontWeight={600}
            color="text.secondary"
          >
            Password Management
          </Typography>

          <FormControlLabel
            control={
              <Switch
                checked={changePassword}
                onChange={(e) => setChangePassword(e.target.checked)}
              />
            }
            label={
              <Box>
                <Typography variant="body2" fontWeight={500}>
                  Reset Password
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Change the student's login password
                </Typography>
              </Box>
            }
          />

          {changePassword && (
            <>
              <Box>
                <Box sx={{ display: "flex", gap: 1 }}>
                  <TextField
                    label="New Password"
                    type="text"
                    fullWidth
                    required
                    value={formData.newPassword}
                    onChange={(e) =>
                      handleChange("newPassword", e.target.value)
                    }
                    error={!!errors.newPassword}
                    helperText={
                      errors.newPassword ||
                      "Student will use this to log in (minimum 6 characters)"
                    }
                  />
                  <Button
                    variant="outlined"
                    onClick={generatePassword}
                    startIcon={<RefreshCw size={16} />}
                    sx={{ minWidth: 120, mt: 0 }}
                  >
                    Generate
                  </Button>
                </Box>
              </Box>

              {formData.newPassword && (
                <Alert severity="warning">
                  <Typography variant="body2" fontWeight={600} mb={0.5}>
                    Important: Save this password
                  </Typography>
                  <Typography variant="body2">
                    Make sure to securely share this new password with the
                    student. The old password will no longer work.
                  </Typography>
                </Alert>
              )}
            </>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={handleClose}>Cancel</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={
            !formData.name ||
            !formData.email ||
            (changePassword && !formData.newPassword)
          }
          startIcon={<Save size={18} />}
        >
          Save Changes
        </Button>
      </DialogActions>
    </Dialog>
  );
}

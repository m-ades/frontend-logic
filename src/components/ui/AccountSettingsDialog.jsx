import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { Visibility, VisibilityOff, Logout as LogoutIcon } from "@mui/icons-material";
import { useAuthState } from "../../context/AuthContext.jsx";
import { fetchJson } from "../../utils/api.js";
import {
  PASSWORD_POLICY,
  PASSWORD_POLICY_MESSAGE,
  isStrongPassword,
} from "../../utils/passwords.js";

const getPasswordCriteriaErrors = (password) => {
  const criteriaErrors = [];

  if (password.length < PASSWORD_POLICY.minLength) {
    criteriaErrors.push(
      `Password must be at least ${PASSWORD_POLICY.minLength} characters.`
    );
  }
  if (!/[a-z]/.test(password)) {
    criteriaErrors.push("Include at least one lowercase letter.");
  }
  if (!/[A-Z]/.test(password)) {
    criteriaErrors.push("Include at least one uppercase letter.");
  }
  if (!/[0-9]/.test(password)) {
    criteriaErrors.push("Include at least one number.");
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    criteriaErrors.push("Include at least one symbol.");
  }

  return criteriaErrors;
};

const getErrorMessage = (error) => {
  if (!error) return "Failed to update password.";
  if (typeof error === "string") return error;
  const message = error.message || String(error);
  if (!message) return "Failed to update password.";
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

export default function AccountSettingsDialog({ open, onClose }) {
  const { user } = useAuthState();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [passwordStrength, setPasswordStrength] = useState(0);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [logoutSuccess, setLogoutSuccess] = useState(false);
  const [logoutError, setLogoutError] = useState("");

  useEffect(() => {
    const strength = calculatePasswordStrength(newPassword);
    setPasswordStrength(strength);
  }, [newPassword]);

  useEffect(() => {
    if (!open) {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setErrors({});
      setSubmitSuccess(false);
      setSubmitError("");
      setLogoutSuccess(false);
      setLogoutError("");
      setLogoutDialogOpen(false);
    }
  }, [open]);

  const calculatePasswordStrength = (password) => {
    if (!password || password.length < PASSWORD_POLICY.minLength) return 0;

    let score = 0;

    if (password.length >= PASSWORD_POLICY.minLength) score += 1;
    if (/[a-z]/.test(password)) score += 0.5;
    if (/[A-Z]/.test(password)) score += 0.5;
    if (/[0-9]/.test(password)) score += 0.5;
    if (/[^A-Za-z0-9]/.test(password)) score += 0.5;

    return Math.min(score, 3);
  };

  const getStrengthInfo = (strength) => {
    switch (strength) {
      case 0:
        return { label: "", color: "grey.300", textColor: "text.disabled" };
      case 1:
        return { label: "Low", color: "#f44336", textColor: "error.main" };
      case 2:
        return { label: "Medium", color: "#ff9800", textColor: "warning.main" };
      case 3:
        return { label: "High", color: "#4caf50", textColor: "success.main" };
      default:
        return { label: "", color: "grey.300", textColor: "text.disabled" };
    }
  };

  const strengthInfo = getStrengthInfo(passwordStrength);

  const validateForm = () => {
    const newErrors = {};

    if (!currentPassword.trim()) {
      newErrors.currentPassword = "Current password is required";
    }

    if (!newPassword) {
      newErrors.newPassword = "New password is required";
    } else {
      const criteriaErrors = getPasswordCriteriaErrors(newPassword);
      if (criteriaErrors.length > 0) {
        newErrors.newPassword = criteriaErrors.join(" ");
      }
    }

    if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    if (currentPassword && newPassword && currentPassword === newPassword) {
      newErrors.newPassword =
        "New password must be different from current password";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePasswordSubmit = (event) => {
    event.preventDefault();
    setSubmitSuccess(false);
    setSubmitError("");

    if (!validateForm()) return;

    if (!user?.id || !user?.username) {
      setSubmitError("Unable to identify the current user. Please log in again.");
      return;
    }

    if (!isStrongPassword(newPassword)) {
      setErrors((prev) => ({
        ...prev,
        newPassword: getPasswordCriteriaErrors(newPassword).join(" "),
      }));
      return;
    }

    fetchJson(`/api/users/${user.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        password: newPassword,
        current_password: currentPassword,
      }),
    })
      .then(() => {
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setErrors({});
        setSubmitSuccess(true);

        setTimeout(() => {
          setSubmitSuccess(false);
        }, 3000);
      })
      .catch((error) => {
        const message = getErrorMessage(error);
        if (message.includes("invalid credentials")) {
          setErrors((prev) => ({
            ...prev,
            currentPassword: "Current password is incorrect.",
          }));
          return;
        }
        setSubmitError(message);
      });
  };

  const clearError = (field) => {
    setErrors((prev) => ({
      ...prev,
      [field]: undefined,
    }));
    if (submitError) {
      setSubmitError("");
    }
  };

  const handleConfirmLogoutAllDevices = async () => {
    setLogoutError("");
    try {
      await fetchJson("/api/auth/logout-all", { method: "POST" });
      setLogoutSuccess(true);
      setLogoutDialogOpen(false);
      onClose?.();
      logout(authDispatch);
      setTimeout(() => {
        setLogoutSuccess(false);
      }, 3000);
    } catch (error) {
      setLogoutError(getErrorMessage(error));
    }
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>Account Settings</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <Typography variant="h6">Change Password</Typography>
            <Divider />

            {submitSuccess && (
              <Alert
                severity="info"
                sx={{
                  mb: 2,
                  bgcolor: "background.paper",
                  color: "text.primary",
                  border: "1px solid",
                  borderColor: "primary.main",
                  "& .MuiAlert-icon": { color: "primary.main" },
                }}
              >
                Password changed successfully.
              </Alert>
            )}
            {submitError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {submitError}
              </Alert>
            )}
            <Box component="form" onSubmit={handlePasswordSubmit}>
              <Stack spacing={2}>
                <TextField
                  fullWidth
                  label="Current Password"
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(event) => {
                    setCurrentPassword(event.target.value);
                    clearError("currentPassword");
                  }}
                  error={!!errors.currentPassword}
                  helperText={errors.currentPassword || " "}
                  FormHelperTextProps={{
                    sx: {
                      color: errors.currentPassword ? "error.main" : "text.secondary",
                    },
                  }}
                  required
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() =>
                            setShowCurrentPassword((prev) => !prev)
                          }
                          edge="end"
                          aria-label="toggle current password visibility"
                          sx={{
                            color: "text.secondary",
                            marginRight: "2px",
                          }}
                        >
                          {showCurrentPassword ? (
                            <VisibilityOff />
                          ) : (
                            <Visibility />
                          )}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  sx={{ mb: 0.5 }}
                />

                <TextField
                  fullWidth
                  label="New Password"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(event) => {
                    setNewPassword(event.target.value);
                    clearError("newPassword");
                  }}
                  error={!!errors.newPassword}
                  helperText={errors.newPassword || PASSWORD_POLICY_MESSAGE}
                  FormHelperTextProps={{
                    sx: {
                      color: errors.newPassword ? "error.main" : "text.secondary",
                    },
                  }}
                  required
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowNewPassword((prev) => !prev)}
                          edge="end"
                          aria-label="toggle new password visibility"
                          sx={{
                            color: "text.secondary",
                            marginRight: "2px",
                          }}
                        >
                          {showNewPassword ? (
                            <VisibilityOff />
                          ) : (
                            <Visibility />
                          )}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  sx={{ mb: 0.5 }}
                />

                <TextField
                  fullWidth
                  label="Confirm New Password"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(event) => {
                    setConfirmPassword(event.target.value);
                    clearError("confirmPassword");
                  }}
                  error={!!errors.confirmPassword}
                  helperText={errors.confirmPassword || " "}
                  FormHelperTextProps={{
                    sx: {
                      color: errors.confirmPassword ? "error.main" : "text.secondary",
                    },
                  }}
                  required
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() =>
                            setShowConfirmPassword((prev) => !prev)
                          }
                          edge="end"
                          aria-label="toggle confirm password visibility"
                          sx={{
                            color: "text.secondary",
                            marginRight: "2px",
                          }}
                        >
                          {showConfirmPassword ? (
                            <VisibilityOff />
                          ) : (
                            <Visibility />
                          )}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  sx={{ mb: 0.5 }}
                />

                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 2,
                    pt: 1,
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1.5,
                      flexGrow: 1,
                      ml: 1.5,
                    }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      Strength:
                    </Typography>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      {[1, 2, 3].map((level) => (
                        <Box
                          key={level}
                          sx={{
                            width: 24,
                            height: 8,
                            borderRadius: 1,
                            backgroundColor:
                              level <= passwordStrength
                                ? strengthInfo.color
                                : "grey.300",
                            transition: "background-color 0.3s",
                            boxShadow: level <= passwordStrength ? 1 : 0,
                          }}
                        />
                      ))}
                    </Box>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: "medium",
                        color: strengthInfo.textColor,
                        minWidth: 60,
                        textAlign: "center",
                      }}
                    >
                      {strengthInfo.label}
                    </Typography>
                  </Box>

                  <Box sx={{ display: "flex", gap: 2 }}>
                    <Button
                      variant="outlined"
                      onClick={() => {
                        setCurrentPassword("");
                        setNewPassword("");
                        setConfirmPassword("");
                        setErrors({});
                      }}
                    >
                      Clear
                    </Button>
                    <Button type="submit" variant="contained" color="primary">
                      Change Password
                    </Button>
                  </Box>
                </Box>
              </Stack>
            </Box>

            <Divider sx={{ my: 1 }} />

            <Box>
              <Typography variant="h6" sx={{ mb: 1 }}>
                Log out of all devices to end active sessions
              </Typography>
              {logoutSuccess && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  Device logged out successfully!
                </Alert>
              )}
              {logoutError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {logoutError}
                </Alert>
              )}
              <Button
                variant="outlined"
                color="error"
                startIcon={<LogoutIcon />}
                onClick={() => setLogoutDialogOpen(true)}
                size="small"
              >
                Log out all devices
              </Button>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={onClose} variant="outlined">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={logoutDialogOpen}
        onClose={() => setLogoutDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Confirm Logout</DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            Are you sure you want to log out from <strong>all devices</strong>{" "}
            except this one? You will need to log in again on all other devices.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 2 }}>
          <Button
            onClick={() => setLogoutDialogOpen(false)}
            variant="outlined"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmLogoutAllDevices}
            variant="contained"
            color="error"
          >
            Yes, Log Out
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

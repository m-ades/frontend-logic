import {
  Box,
  Typography,
  CardContent,
  Stack,
  Switch,
  FormControlLabel,
  Divider,
  Avatar,
  Button,
  TextField,
  Grid,
} from "@mui/material";
import { Person as PersonIcon, Edit as EditIcon } from "@mui/icons-material";
import { useState } from "react";
import ThemedCard from "../components/ui/ThemedCard.jsx";
import { useThemeState, useThemeDispatch } from "../context/ThemeContext.jsx";
import {
  useLayoutState,
  useLayoutDispatch,
  toggleSidebarHover,
} from "../context/LayoutContext.jsx";
import { useAuthState } from "../context/AuthContext.jsx";
import { normalizeRole } from "../utils/auth.js";

export default function Profile() {
  const theme = useThemeState();
  const changeTheme = useThemeDispatch();
  const isDark = theme.palette.mode === "dark";

  const layoutState = useLayoutState();
  const layoutDispatch = useLayoutDispatch();
  const { user } = useAuthState();

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    username: user?.username || "username",
    role: normalizeRole(user?.role) || "Student",
  });

  const handleThemeToggle = () => {
    changeTheme(isDark ? "default" : "dark");
  };

  const handleSidebarHoverToggle = () => {
    toggleSidebarHover(layoutDispatch);
  };

  const handleProfileEdit = () => {
    setIsEditingProfile(!isEditingProfile);
  };

  const handleProfileSave = () => {
    // Add your profile update logic here
    setIsEditingProfile(false);
  };

  const handleInputChange = (field) => (event) => {
    setProfileData({
      ...profileData,
      [field]: event.target.value,
    });
  };

  return (
    <Box>
      <Typography variant="h4" component="h1" sx={{ mb: 3, fontWeight: 600 }}>
        Profile & Preferences
      </Typography>

      {/* Profile Information Card */}
      <ThemedCard>
        <CardContent>
          <Stack spacing={3}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Typography variant="h6" component="h2">Profile Information</Typography>
              <Button
                startIcon={<EditIcon />}
                onClick={handleProfileEdit}
                variant={isEditingProfile ? "contained" : "outlined"}
              >
                {isEditingProfile ? "Cancel" : "Edit"}
              </Button>
            </Box>
            <Divider />

            <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
              <Avatar
                sx={{
                  width: 80,
                  height: 80,
                  bgcolor: "primary.main",
                  fontSize: "2rem",
                }}
              >
                <PersonIcon sx={{ fontSize: "2.5rem" }} />
              </Avatar>
              <Box>
                <Typography variant="h6" component="div">{profileData.username}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {profileData.role}
                </Typography>
              </Box>
            </Box>

            {isEditingProfile ? (
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Username"
                    value={profileData.username}
                    onChange={handleInputChange("username")}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Button
                    variant="contained"
                    onClick={handleProfileSave}
                    sx={{ mr: 2 }}
                  >
                    Save Changes
                  </Button>
                  <Button variant="outlined" onClick={handleProfileEdit}>
                    Cancel
                  </Button>
                </Grid>
              </Grid>
            ) : (
              <Stack spacing={2}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Role
                  </Typography>
                  <Typography variant="body1">{profileData.role}</Typography>
                </Box>
              </Stack>
            )}
          </Stack>
        </CardContent>
      </ThemedCard>

      {/* Appearance Settings Card */}
      <ThemedCard sx={{ mt: 3 }}>
        <CardContent>
          <Stack spacing={3}>
            <Typography variant="h6" component="h2">Appearance</Typography>
            <Divider />
            <FormControlLabel
              control={
                <Switch
                  checked={isDark}
                  onChange={handleThemeToggle}
                  color="primary"
                />
              }
              label="Dark Mode"
            />
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: -2, ml: 4 }}
            >
              Switch between light and dark theme
            </Typography>
          </Stack>
        </CardContent>
      </ThemedCard>

      {/* Sidebar Settings Card */}
      <ThemedCard sx={{ mt: 3 }}>
        <CardContent>
          <Stack spacing={3}>
            <Typography variant="h6" component="h2">Sidebar Preferences</Typography>
            <Divider />
            <FormControlLabel
              control={
                <Switch
                  checked={layoutState.sidebarHoverEnabled}
                  onChange={handleSidebarHoverToggle}
                  color="primary"
                />
              }
              label="Auto-expand on Hover"
            />
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: -2, ml: 4 }}
            >
              When enabled, the sidebar will automatically expand when you hover
              over it
            </Typography>
          </Stack>
        </CardContent>
      </ThemedCard>
    </Box>
  );
}

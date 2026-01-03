import {
  Box,
  Typography,
  CardContent,
  Stack,
  Switch,
  FormControlLabel,
  Divider,
} from "@mui/material";
import ThemedCard from "../components/ui/ThemedCard.jsx";
import { useThemeState, useThemeDispatch } from "../context/ThemeContext.jsx";
import {
  useLayoutState,
  useLayoutDispatch,
  toggleSidebarHover,
} from "../context/LayoutContext.jsx";

export default function Settings() {
  const theme = useThemeState();
  const changeTheme = useThemeDispatch();
  const isDark = theme.palette.mode === "dark";

  const layoutState = useLayoutState();
  const layoutDispatch = useLayoutDispatch();

  const handleThemeToggle = () => {
    changeTheme(isDark ? "default" : "dark");
  };

  const handleSidebarHoverToggle = () => {
    toggleSidebarHover(layoutDispatch);
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 600 }}>
        Settings
      </Typography>

      <ThemedCard>
        <CardContent>
          <Stack spacing={3}>
            <Typography variant="h6">Appearance</Typography>
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
          </Stack>
        </CardContent>
      </ThemedCard>

      <ThemedCard sx={{ mt: 3 }}>
        <CardContent>
          <Stack spacing={3}>
            <Typography variant="h6">Sidebar</Typography>
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
              componentsProps={{
                typography: {
                  sx: { display: "flex", flexDirection: "column" },
                },
              }}
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

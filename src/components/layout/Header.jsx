import { AppBar, Toolbar, Typography, Box } from "@mui/material";
import ThemeToggle from "./ThemeToggle.jsx";

export default function Header() {
  return (
    <AppBar
      position="sticky"
      sx={{
        backgroundColor: "background.paper",
        color: "text.primary",
        boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
        borderBottom: "1px solid",
        borderColor: "divider",
      }}
    >
      <Toolbar>
        <Typography
          variant="h6"
          noWrap
          component="div"
          sx={{ fontWeight: 600, flexGrow: 1 }}
        >
          PHILO/MATH/CSCI 275 Symbolic Logic
        </Typography>
        <ThemeToggle />
      </Toolbar>
    </AppBar>
  );
}

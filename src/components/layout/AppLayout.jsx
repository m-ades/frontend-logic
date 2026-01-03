import { Box, Toolbar } from "@mui/material";
import Header from "./Header.jsx";
import Sidebar from "./Sidebar.jsx";
import SidebarStructure from "./SidebarStructure.jsx";
import { useLocation } from "react-router-dom";

export default function AppLayout({ children, onSignOut }) {
  const location = useLocation();

  // Check if current path includes /assignments or /practice
  const showToolbar =
    location.pathname.includes("/assignments") ||
    location.pathname.includes("/practice");

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar
        structure={SidebarStructure}
        location={location}
        onSignOut={onSignOut}
      />
      <Box sx={{ display: "flex", flexDirection: "column", flexGrow: 1 }}>
        <Header />
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: 3,
            backgroundColor: "background.default",
            minHeight: "100vh",
            overflow: "auto",
          }}
        >
          {showToolbar && <Toolbar />}
          {children}
        </Box>
      </Box>
    </Box>
  );
}

import { Box, Toolbar } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import Header from "./Header.jsx";
import Sidebar from "./Sidebar.jsx";
import StudentSidebarStructure from "./SidebarStructure.jsx";
import InstructorSidebarStructure from "./InstructorSidebarStructure.jsx";
import { useLocation } from "react-router-dom";
import {
  useAuthState,
  useAuthDispatch,
  logout,
} from "../../context/AuthContext";
import {
  useCoursesDispatch,
  initializeCourses,
} from "../../context/CoursesContext";

export default function AppLayout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthState();
  const authDispatch = useAuthDispatch();
  const coursesDispatch = useCoursesDispatch();

  // Initialize courses when user is loaded
  useEffect(() => {
    if (user?.role) {
      initializeCourses(coursesDispatch, user.role);
    }
  }, [user?.role, coursesDispatch]);

  // Check if current path includes /assignment or /worksheet (for both student and instructor)
  const showToolbar =
    location.pathname.includes("/assignment/") ||
    location.pathname.includes("/worksheet/");

  // Choose sidebar structure based on user role
  const sidebarStructure =
    user?.role === "instructor"
      ? InstructorSidebarStructure
      : StudentSidebarStructure;

  const handleSignOut = () => {
    logout(authDispatch);
    navigate("/login");
  };

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar
        structure={sidebarStructure}
        location={location}
        onSignOut={handleSignOut}
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

import { Box } from "@mui/material";
import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import Header from "./Header.jsx";
import Sidebar from "./Sidebar.jsx";
import StudentSidebarStructure from "./StudentSidebarStructure.jsx";
import InstructorSidebarStructure from "./InstructorSidebarStructure.jsx";
import AccountSettingsDialog from "../ui/AccountSettingsDialog.jsx";
import RulesReference from "../ui/RulesReference.jsx";
import { useAuthState, useAuthDispatch, logout } from "../../context/AuthContext";
import { useCoursesDispatch, useCoursesState, initializeCourses, resetCourses } from "../../context/CoursesContext";
import { clearStoredUser, fetchJson } from "../../utils/api.js";
import { isInstructorRole } from "../../utils/auth.js";

export default function AppLayout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthState();
  const authDispatch = useAuthDispatch();
  const coursesDispatch = useCoursesDispatch();
  const { initialized } = useCoursesState();
  const mainContentRef = useRef(null);
  const [isAccountSettingsOpen, setIsAccountSettingsOpen] = useState(false);

  useEffect(() => {
    if (user?.role && user?.id && !initialized) {
      initializeCourses(coursesDispatch);
    }
  }, [user?.role, user?.id, initialized, coursesDispatch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: "smooth",
      });

      if (mainContentRef.current) {
        mainContentRef.current.scrollTo({
          top: 0,
          left: 0,
          behavior: "smooth",
        });
      }

    }, 0);

    return () => clearTimeout(timer);
  }, [location.pathname]);

  const isInstructorRoute = location.pathname.startsWith("/instructor")
    ? true
    : location.pathname.startsWith("/student")
    ? false
    : isInstructorRole(user?.role);
  const sidebarStructure = isInstructorRoute
    ? InstructorSidebarStructure
    : StudentSidebarStructure;

  const handleSignOut = async () => {
    try {
      await fetchJson("/api/auth/logout", { method: "POST" });
    } catch (error) {
      console.warn("Signing out failed", error);
    } finally {
      clearStoredUser();
      logout(authDispatch);
      resetCourses(coursesDispatch);
      navigate("/login");
    }
  };

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", minWidth: 0 }}>
      <Sidebar
        structure={sidebarStructure}
        location={location}
        onSignOut={handleSignOut}
        onOpenSettings={() => setIsAccountSettingsOpen(true)}
      />
      <Box sx={{ display: "flex", flexDirection: "column", flexGrow: 1, minWidth: 0 }}>
        <Header />
        <Box
          component="main"
          ref={mainContentRef}
          sx={{
            flexGrow: 1,
            p: 3,
            backgroundColor: "background.default",
            minHeight: "100vh",
            overflow: "auto",
            overflowX: "hidden",
            minWidth: 0,
          }}
        >
          {children}
        </Box>
      </Box>
      <AccountSettingsDialog
        open={isAccountSettingsOpen}
        onClose={() => setIsAccountSettingsOpen(false)}
      />
      <RulesReference />
    </Box>
  );
}

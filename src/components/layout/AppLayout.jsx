import { Box, useMediaQuery, useTheme } from "@mui/material";
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
import { useLayoutState } from "../../context/LayoutContext.jsx";

export default function AppLayout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthState();
  const { isRulesReferenceOpen } = useLayoutState();
  const authDispatch = useAuthDispatch();
  const coursesDispatch = useCoursesDispatch();
  const { initialized } = useCoursesState();
  const mainContentRef = useRef(null);
  const [isAccountSettingsOpen, setIsAccountSettingsOpen] = useState(false);
  const theme = useTheme();
  const isLargeScreen = useMediaQuery(theme.breakpoints.up("lg"));
  const hasDesktopPointer = useMediaQuery("(hover: hover) and (pointer: fine)");
  const isDesktopRulebookLayout = isLargeScreen && hasDesktopPointer;
  const shouldShiftShellForRulebook = isDesktopRulebookLayout && isRulesReferenceOpen;

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
    <Box
      sx={{
        display: "flex",
        minHeight: "100vh",
        minWidth: 0,
        height: { xs: "auto", md: "100dvh" },
        overflow: { xs: "visible", md: "hidden" },
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexGrow: 1,
          minWidth: 0,
          minHeight: { xs: "auto", md: 0 },
          overflow: { xs: "visible", md: "hidden" },
          transform: shouldShiftShellForRulebook ? "translateX(16px)" : "translateX(0)",
          transition: (t) =>
            t.transitions.create("transform", {
              duration: t.transitions.duration.shorter,
            }),
        }}
      >
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
              pt: /\/assignment\/[^/]+$/.test(location.pathname) ? 2 : 3,
              backgroundColor: "background.default",
              minHeight: { xs: "100vh", md: 0 },
              overflow: "auto",
              overflowX: "hidden",
              minWidth: 0,
            }}
          >
            {children}
          </Box>
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

import { Box, Toolbar } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useEffect, useRef } from "react";
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
  const mainContentRef = useRef(null);

  // Initialize courses when user is loaded
  useEffect(() => {
    if (user?.role) {
      initializeCourses(coursesDispatch, user.role);
    }
  }, [user?.role, coursesDispatch]);

  // Scroll to top when route changes
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

      const scrollableElements = document.querySelectorAll("*");
      scrollableElements.forEach((element) => {
        const style = window.getComputedStyle(element);
        const isScrollable =
          style.overflow === "auto" ||
          style.overflow === "scroll" ||
          style.overflowY === "auto" ||
          style.overflowY === "scroll";

        if (isScrollable && element.scrollTop > 0) {
          element.scrollTo({
            top: 0,
            left: 0,
            behavior: "smooth",
          });
        }
      });

      const muiBoxes = document.querySelectorAll(".MuiBox-root");
      muiBoxes.forEach((box) => {
        if (box.scrollTop > 0) {
          box.scrollTo({
            top: 0,
            left: 0,
            behavior: "smooth",
          });
        }
      });
    }, 0);

    return () => clearTimeout(timer);
  }, [location.pathname]);

  const showToolbar =
    location.pathname.includes("/assignment/") ||
    location.pathname.includes("/worksheet/");

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
          ref={mainContentRef}
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

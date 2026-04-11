import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import StudentSidebarStructure from "./StudentSidebarStructure.jsx";
import InstructorSidebarStructure from "./InstructorSidebarStructure.jsx";
import { useAuthState, useAuthDispatch, logout } from "../../context/AuthContext";
import {
  useCoursesDispatch,
  useCoursesState,
  initializeCourses,
  resetCourses,
} from "../../context/CoursesContext";
import { clearStoredUser, fetchJson } from "../../utils/api.js";
import { isInstructorRole } from "../../utils/auth.js";
import { AppRuntimeProvider } from "../../context/AppRuntimeContext.jsx";
import { createAppRuntime } from "../../runtime/appRuntime.js";
import ShellFrame from "./ShellFrame.jsx";

function AppShell({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthState();
  const authDispatch = useAuthDispatch();
  const coursesDispatch = useCoursesDispatch();
  const coursesState = useCoursesState();
  const { initialized } = coursesState;
  const [isAccountSettingsOpen, setIsAccountSettingsOpen] = useState(false);

  useEffect(() => {
    if (user?.role && user?.id && !initialized) {
      initializeCourses(coursesDispatch);
    }
  }, [user?.role, user?.id, initialized, coursesDispatch]);

  const isInstructorRoute = location.pathname.startsWith("/instructor")
    ? true
    : location.pathname.startsWith("/student")
    ? false
    : isInstructorRole(user?.role);
  const baseSidebarStructure = isInstructorRoute
    ? InstructorSidebarStructure
    : StudentSidebarStructure;
  const sidebarStructure = baseSidebarStructure;

  const routeKind = isInstructorRoute ? "instructor" : "student";

  const runtimeValue = createAppRuntime({
    coursesDispatch,
    coursesState,
    routeKind,
    user,
  });

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
    <AppRuntimeProvider value={runtimeValue}>
      <ShellFrame
        location={location}
        sidebarStructure={sidebarStructure}
        onSignOut={handleSignOut}
        onOpenSettings={() => setIsAccountSettingsOpen(true)}
        showAccountSettings
        isAccountSettingsOpen={isAccountSettingsOpen}
        onCloseAccountSettings={() => setIsAccountSettingsOpen(false)}
      >
        {children}
      </ShellFrame>
    </AppRuntimeProvider>
  );
}

export default function AppLayout({ children }) {
  return <AppShell>{children}</AppShell>;
}

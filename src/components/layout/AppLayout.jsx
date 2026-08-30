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
import LoadingSpinner from "../ui/LoadingSpinner.jsx";

const TEXT_SIZE_STORAGE_KEY = "logicapp_text_size";
const TEXT_SIZE_OPTIONS = {
  smaller: 0.8,
  default: 1,
  larger: 1.2,
  largest: 1.4,
};

function readTextSize() {
  if (typeof window === "undefined") return "default";

  try {
    const savedValue = window.localStorage.getItem(TEXT_SIZE_STORAGE_KEY);
    return savedValue && TEXT_SIZE_OPTIONS[savedValue] ? savedValue : "default";
  } catch {
    return "default";
  }
}

function applyTextSize(size) {
  if (typeof document === "undefined") return;

  const scale = TEXT_SIZE_OPTIONS[size] || TEXT_SIZE_OPTIONS.default;

  // the whole app listens at the root
  document.documentElement.style.fontSize = `${80 * scale}%`;
}

function AppShell({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthState();
  const authDispatch = useAuthDispatch();
  const coursesDispatch = useCoursesDispatch();
  const coursesState = useCoursesState();
  const { error: coursesError, initialized } = coursesState;
  const [isAccountSettingsOpen, setIsAccountSettingsOpen] = useState(false);
  const [textSize, setTextSize] = useState(readTextSize);

  useEffect(() => {
    if (user?.role && user?.id && !initialized) {
      initializeCourses(coursesDispatch);
    }
  }, [user?.role, user?.id, initialized, coursesDispatch]);

  useEffect(() => {
    applyTextSize(textSize);

    if (typeof window === "undefined") return;

    try {
      window.localStorage.setItem(TEXT_SIZE_STORAGE_KEY, textSize);
    } catch {
      // storage can fail and we move on
    }
  }, [textSize]);

  const isInstructorRoute = location.pathname.startsWith("/instructor")
    ? true
    : location.pathname.startsWith("/student")
    ? false
    : isInstructorRole(user?.role);
  const baseSidebarStructure = isInstructorRoute
    ? InstructorSidebarStructure
    : StudentSidebarStructure;
  const sidebarStructure = baseSidebarStructure;
  const activeCourse = coursesState.courses.find((course) => course.id === coursesState.activeCourseId);
  const logicSystem = activeCourse?.logicSystem ?? activeCourse?.logic_system;

  const routeKind = isInstructorRoute ? "instructor" : "student";

  const runtimeValue = createAppRuntime({
    coursesDispatch,
    coursesState,
    routeKind,
    user,
  });
  const pageContent = !initialized && !coursesError
    ? <LoadingSpinner label="Loading course..." />
    : children;

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
        textSize={textSize}
        onTextSizeChange={setTextSize}
        logicSystem={logicSystem}
      >
        {pageContent}
      </ShellFrame>
    </AppRuntimeProvider>
  );
}

export default function AppLayout({ children }) {
  return <AppShell>{children}</AppShell>;
}

import { useLocation, useNavigate } from "react-router-dom";
import { useMemo } from "react";
import StudentSidebarStructure from "./StudentSidebarStructure.jsx";
import { AppRuntimeProvider } from "../../context/AppRuntimeContext.jsx";
import { useSandbox } from "../../context/SandboxContext.jsx";
import ShellFrame from "./ShellFrame.jsx";
import {
  buildBreadcrumbInfo,
  buildRuntimePaths,
  remapStudentPath,
} from "../../runtime/sandboxRuntime.js";

const STUDENT_SANDBOX_PREFIX = "/sandbox";
const sandboxSidebarLabels = new Set(["Dashboard", "Assignments", "Practice", "Grades"]);

function SandboxFrame({ children, runtimeValue, sidebarStructure, onExit }) {
  const location = useLocation();

  return (
    <AppRuntimeProvider value={runtimeValue}>
      <ShellFrame
        location={location}
        sidebarStructure={sidebarStructure}
        onSignOut={onExit}
        onOpenSettings={undefined}
      >
        {children}
      </ShellFrame>
    </AppRuntimeProvider>
  )
}

export default function SandboxLayout({ children }) {
  const navigate = useNavigate();
  const sandbox = useSandbox();
  const runtimePaths = useMemo(
    () => buildRuntimePaths("student", STUDENT_SANDBOX_PREFIX),
    []
  );
  const courseState = useMemo(() => ({
    courses: sandbox.courses,
    activeCourseId: sandbox.activeCourseId,
    assignmentsByCourse: {
      [sandbox.activeCourseId]: sandbox.assignments,
    },
    practicesByCourse: {
      [sandbox.activeCourseId]: sandbox.practices,
    },
    gradebookByCourse: {},
    loading: false,
    error: null,
    initialized: true,
  }), [sandbox.activeCourseId, sandbox.assignments, sandbox.courses, sandbox.practices]);

  const runtimeValue = useMemo(() => ({
    mode: "sandbox",
    ...runtimePaths,
    isSandbox: true,
    remapStudentPath: (path) => remapStudentPath(path, STUDENT_SANDBOX_PREFIX),
    getBreadcrumbInfo: (pathname) => buildBreadcrumbInfo(pathname, {
      routeKind: "student",
      routePrefix: runtimePaths.routePrefix,
      stripPrefix: runtimePaths.routePrefix,
    }),
    storageScope: "session",
    user: sandbox.user,
    courses: courseState.courses,
    activeCourseId: courseState.activeCourseId,
    sandbox,
    instructorSandbox: null,
    courseState,
    courseActions: {
      setActiveCourse: sandbox.setActiveCourseId,
      initializeCourses: async () => undefined,
      resetCourses: async () => undefined,
      addNewCourse: async () => undefined,
      setAssignments: () => undefined,
      setPractices: () => undefined,
      setGradebook: () => undefined,
    },
  }), [courseState, runtimePaths, sandbox]);

  const sidebarStructure = StudentSidebarStructure
    .filter((item) => sandboxSidebarLabels.has(item.label))
    .map((item) => ({
      ...item,
      link: remapStudentPath(item.link, STUDENT_SANDBOX_PREFIX),
    }));

  return (
    <SandboxFrame
      runtimeValue={runtimeValue}
      sidebarStructure={sidebarStructure}
      onExit={() => navigate("/")}
    >
      {children}
    </SandboxFrame>
  );
}

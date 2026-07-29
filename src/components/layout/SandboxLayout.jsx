import { useLocation, useNavigate } from "react-router-dom";
import { useMemo } from "react";
import StudentSidebarStructure from "./StudentSidebarStructure.jsx";
import InstructorSidebarStructure from "./InstructorSidebarStructure.jsx";
import { AppRuntimeProvider } from "../../context/AppRuntimeContext.jsx";
import { useSandbox } from "../../context/SandboxContext.jsx";
import { useInstructorSandbox } from "../../context/InstructorSandboxContext.jsx";
import ShellFrame from "./ShellFrame.jsx";
import {
  buildBreadcrumbInfo,
  buildRuntimePaths,
  remapStudentPath,
  remapRoutePath,
} from "../../runtime/sandboxRuntime.js";

const STUDENT_SANDBOX_PREFIX = "/sandbox/student";
const INSTRUCTOR_SANDBOX_PREFIX = "/sandbox/instructor";
const sandboxSidebarLabels = new Set(["Dashboard", "Assignments", "Learn", "Grades"]);
const remapInstructorPath = (path) => remapRoutePath(path, "/instructor", INSTRUCTOR_SANDBOX_PREFIX);

function SandboxFrame({ children, runtimeValue, sidebarStructure, onExit }) {
  const location = useLocation();
  const activeCourse = runtimeValue?.courseState?.courses?.find(
    (course) => course.id === runtimeValue?.courseState?.activeCourseId
  );
  const logicSystem = activeCourse?.logicSystem ?? activeCourse?.logic_system;

  return (
    <AppRuntimeProvider value={runtimeValue}>
      <ShellFrame
        location={location}
        sidebarStructure={sidebarStructure}
        onSignOut={onExit}
        onOpenSettings={undefined}
        logicSystem={logicSystem}
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
    getBreadcrumbInfo: (pathname, returnTo) => buildBreadcrumbInfo(pathname, {
      routeKind: "student",
      routePrefix: runtimePaths.routePrefix,
      stripPrefix: runtimePaths.routePrefix,
      returnTo,
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
export function InstructorSandboxLayout({ children }) {
  const navigate = useNavigate();
  const sandbox = useInstructorSandbox();
  const runtimePaths = useMemo(
    () => buildRuntimePaths("instructor", INSTRUCTOR_SANDBOX_PREFIX),
    []
  );

  const runtimeValue = useMemo(() => ({
    mode: "sandbox",
    ...runtimePaths,
    isSandbox: true,
    remapStudentPath: remapInstructorPath,
    getBreadcrumbInfo: (pathname, returnTo) => buildBreadcrumbInfo(pathname, {
      routeKind: "instructor",
      routePrefix: runtimePaths.routePrefix,
      stripPrefix: runtimePaths.routePrefix,
      returnTo,
    }),
    storageScope: "session",
    user: sandbox.user,
    courses: sandbox.courseState.courses,
    activeCourseId: sandbox.courseState.activeCourseId,
    sandbox: null,
    instructorSandbox: sandbox,
    courseState: sandbox.courseState,
    courseActions: {
      setActiveCourse: sandbox.setActiveCourseId,
      addNewCourse: sandbox.addNewCourse,
      initializeCourses: async () => undefined,
      resetCourses: async () => undefined,
      setAssignments: () => undefined,
      setPractices: () => undefined,
      setGradebook: () => undefined,
      createAssignment: sandbox.createAssignment,
      updateAssignment: sandbox.updateAssignment,
      toggleAssignmentLock: sandbox.toggleAssignmentLock,
      toggleAssignmentPublish: sandbox.toggleAssignmentPublish,
      duplicateAssignment: sandbox.duplicateAssignment,
      deleteAssignment: sandbox.deleteAssignment,
      updateAssignmentDueDate: sandbox.updateAssignmentDueDate,
      createPractice: sandbox.createPractice,
      updatePractice: sandbox.updatePractice,
      togglePracticeLock: sandbox.togglePracticeLock,
      togglePracticePublish: sandbox.togglePracticePublish,
      duplicatePractice: sandbox.duplicatePractice,
      deletePractice: sandbox.deletePractice,
      updateCourseSettings: sandbox.updateCourseSettings,
      saveCourseSettings: sandbox.updateCourseSettings,
      toggleArchiveCourse: sandbox.toggleArchiveCourse,
      addStudentToCourse: sandbox.addStudent,
      bulkAddStudents: sandbox.bulkAddStudents,
      removeStudentFromCourse: sandbox.removeStudent,
      updateStudentRole: sandbox.updateStudentRole,
      getAccommodations: sandbox.getAccommodations,
      saveAccommodations: sandbox.saveAccommodations,
      getDeadlines: sandbox.getDeadlines,
      saveDeadline: sandbox.saveDeadline,
      loadInstructorDashboard: async (courseId) => {
        const snapshot = sandbox.dashboardAnalyticsByCourse?.[courseId];
        return {
          analytics: snapshot?.analytics || { gradeSummary: null, assignmentStats: [], timeByCategory: [] },
          gradebookSummary: snapshot?.gradebookSummary || [],
        };
      },
    },
  }), [runtimePaths, sandbox]);

  const sidebarStructure = InstructorSidebarStructure
    .filter((item) => item.label !== "Contact")
    .map((item) => ({
      ...item,
      link: remapInstructorPath(item.link),
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

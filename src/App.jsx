import { ThemeProvider as MuiThemeProvider } from "@mui/material/styles";
import { CssBaseline } from "@mui/material";
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext.jsx";
import { useThemeState } from "./context/ThemeContext.jsx";
import { LayoutProvider } from "./context/LayoutContext.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { CoursesProvider } from "./context/CoursesContext.jsx";
import { SandboxProvider } from "./context/SandboxContext.jsx";
import { InstructorSandboxProvider } from "./context/InstructorSandboxContext.jsx";
import ErrorBoundary from "./components/ui/ErrorBoundary.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import ScrollToTop from "./components/layout/ScrollToTop.jsx";
import AppLayout from "./components/layout/AppLayout.jsx";
import SandboxLayout, { InstructorSandboxLayout } from "./components/layout/SandboxLayout.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Worksheet from "./pages/Worksheet.jsx";
import Assignments from "./pages/Assignments.jsx";
import Practice from "./pages/Practice.jsx";
import Grades from "./pages/Grades.jsx";
import ContactStudent from "./pages/ContactStudent.jsx";
import InstructorDashboard from "./pages/instructor/InstructorDashboard.jsx";
import InstructorGradebook from "./pages/instructor/InstructorGradebook.jsx";
import InstructorControls from "./pages/instructor/InstructorControls.jsx";
import InstructorAssignments from "./pages/instructor/InstructorAssignments.jsx";
import AssignmentBuilder from "./pages/instructor/InstructorAssignmentBuilder.jsx";
import Login from "./pages/Login.jsx";
import PublicLandingRoute from "./pages/PublicLandingRoute.jsx";
import Courses from "./pages/Courses.jsx";
import Profile from "./pages/Profile.jsx";
import InstructorPractice from "./pages/instructor/InstructorPractice.jsx";
import InstructorRoster from "./pages/instructor/InstructorRoster.jsx";
import InstructorContact from "./pages/instructor/Contact.jsx";
import TextbookHubPage from "./pages/TextbookHubPage.jsx";
import TextbookChapterPage from "./pages/TextbookChapterPage.jsx";
import InstructorTextbookLinks from "./pages/instructor/InstructorTextbookLinks.jsx";
import { useAppRuntime } from "./hooks/useAppRuntime.js";

const withLayout = (LayoutComponent, PageComponent) => (
  <LayoutComponent>
    <PageComponent />
  </LayoutComponent>
);

const renderRouteGroup = (routes, LayoutComponent) => (
  routes.map(({ path, PageComponent }) => (
    <Route
      key={path}
      path={path}
      element={withLayout(LayoutComponent, PageComponent)}
    />
  ))
);

function AppProviders() {
  return (
    <AuthProvider>
      <CoursesProvider>
        <Outlet />
      </CoursesProvider>
    </AuthProvider>
  );
}

function SandboxProviders() {
  return (
    <SandboxProvider>
      <Outlet />
    </SandboxProvider>
  );
}

function InstructorSandboxProviders() {
  return (
    <InstructorSandboxProvider>
      <Outlet />
    </InstructorSandboxProvider>
  );
}

// shared routes select the page from the authenticated runtime role
function RolePage({ student: StudentPage, instructor: InstructorPage }) {
  const { isInstructor } = useAppRuntime();
  const Page = isInstructor ? InstructorPage : StudentPage;
  return <Page />;
}

// old role links keep their query hash and navigation state at the shared path
function LegacyRoleRedirect() {
  const { pathname, search, hash, state } = useLocation();
  const path = pathname.replace(/^\/(student|instructor)(?=\/|$)/, "") || "/dashboard";
  const returnTo = state?.returnTo?.replace(/^\/(student|instructor)(?=\/|$)/, "");
  return <Navigate to={`${path}${search}${hash}`} state={state ? { ...state, returnTo } : state} replace />;
}

function AppRoutes() {
  const instructorSandboxRoutes = [
    { path: "/sandbox/instructor/courses", PageComponent: Courses },
    { path: "/sandbox/instructor/dashboard", PageComponent: InstructorDashboard },
    { path: "/sandbox/instructor/assignments", PageComponent: InstructorAssignments },
    { path: "/sandbox/instructor/practice", PageComponent: InstructorPractice },
    { path: "/sandbox/instructor/textbook", PageComponent: TextbookHubPage },
    { path: "/sandbox/instructor/textbook/:chapter", PageComponent: TextbookChapterPage },
    { path: "/sandbox/instructor/textbook-links", PageComponent: InstructorTextbookLinks },
    { path: "/sandbox/instructor/gradebook", PageComponent: InstructorGradebook },
    { path: "/sandbox/instructor/roster", PageComponent: InstructorRoster },
    { path: "/sandbox/instructor/contact", PageComponent: InstructorContact },
    { path: "/sandbox/instructor/controls", PageComponent: InstructorControls },
    { path: "/sandbox/instructor/assignment/:assignmentId", PageComponent: Worksheet },
  ];

  return (
    <Routes>
      <Route element={<SandboxProviders />}>
        <Route path="/sandbox" element={<Navigate to="/sandbox/student/dashboard" replace />} />
        <Route path="/sandbox/student" element={<Navigate to="/sandbox/student/dashboard" replace />} />
        <Route
          path="/sandbox/student/courses"
          element={(
            <SandboxLayout>
              <Courses />
            </SandboxLayout>
          )}
        />
        <Route
          path="/sandbox/student/dashboard"
          element={(
            <SandboxLayout>
              <Dashboard />
            </SandboxLayout>
          )}
        />
        <Route
          path="/sandbox/student/assignments"
          element={(
            <SandboxLayout>
              <Assignments />
            </SandboxLayout>
          )}
        />
        <Route
          path="/sandbox/student/practice"
          element={(
            <SandboxLayout>
              <Practice />
            </SandboxLayout>
          )}
        />
        <Route
          path="/sandbox/student/textbook"
          element={(
            <SandboxLayout>
              <TextbookHubPage />
            </SandboxLayout>
          )}
        />
        <Route
          path="/sandbox/student/textbook/:chapter"
          element={(
            <SandboxLayout>
              <TextbookChapterPage />
            </SandboxLayout>
          )}
        />
        <Route
          path="/sandbox/student/grades"
          element={(
            <SandboxLayout>
              <Grades />
            </SandboxLayout>
          )}
        />
        <Route
          path="/sandbox/student/assignment/:assignmentId"
          element={(
            <SandboxLayout>
              <Worksheet />
            </SandboxLayout>
          )}
        />
      </Route>

      <Route element={<InstructorSandboxProviders />}>
        <Route
          path="/sandbox/instructor"
          element={<Navigate to="/sandbox/instructor/dashboard" replace />}
        />
        {renderRouteGroup(instructorSandboxRoutes, InstructorSandboxLayout)}
      </Route>

      <Route element={<AppProviders />}>
        <Route path="/" element={<PublicLandingRoute />} />
        <Route path="/login" element={<Login />} />
        <Route path="/student/*" element={<LegacyRoleRedirect />} />
        <Route path="/instructor/*" element={<LegacyRoleRedirect />} />
        <Route element={(
          <ProtectedRoute allowedRoles={["student", "instructor"]}>
            <AppLayout><Outlet /></AppLayout>
          </ProtectedRoute>
        )}>
          <Route path="/dashboard" element={<RolePage student={Dashboard} instructor={InstructorDashboard} />} />
          <Route path="/assignments" element={<RolePage student={Assignments} instructor={InstructorAssignments} />} />
          <Route path="/practice" element={<RolePage student={Practice} instructor={InstructorPractice} />} />
          <Route path="/contact" element={<RolePage student={ContactStudent} instructor={InstructorContact} />} />
          <Route path="/courses" element={<Courses />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/textbook" element={<TextbookHubPage />} />
          <Route path="/textbook/:chapter" element={<TextbookChapterPage />} />
          <Route path="/assignment/:assignmentId" element={<Worksheet />} />
          <Route path="/grades" element={<ProtectedRoute allowedRoles={["student"]}><Grades /></ProtectedRoute>} />
          <Route element={<ProtectedRoute allowedRoles={["instructor"]}><Outlet /></ProtectedRoute>}>
            <Route path="/gradebook" element={<InstructorGradebook />} />
            <Route path="/controls" element={<InstructorControls />} />
            <Route path="/roster" element={<InstructorRoster />} />
            <Route path="/textbook-links" element={<InstructorTextbookLinks />} />
            <Route path="/assignment-builder" element={<AssignmentBuilder />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function AppContent() {
  const theme = useThemeState();
  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline enableColorScheme />
      <BrowserRouter>
        <ScrollToTop />
        <LayoutProvider>
          <AppRoutes />
        </LayoutProvider>
      </BrowserRouter>
    </MuiThemeProvider>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </ErrorBoundary>
  );
}

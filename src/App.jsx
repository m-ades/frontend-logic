import { ThemeProvider as MuiThemeProvider } from "@mui/material/styles";
import { CssBaseline } from "@mui/material";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext.jsx";
import { useThemeState } from "./context/ThemeContext.jsx";
import { LayoutProvider } from "./context/LayoutContext.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { CoursesProvider } from "./context/CoursesContext.jsx";
import ErrorBoundary from "./components/ui/ErrorBoundary.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import ScrollToTop from "./components/layout/ScrollToTop.jsx";
import AppLayout from "./components/layout/AppLayout.jsx";
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
import Courses from "./pages/Courses.jsx";
import Profile from "./pages/Profile.jsx";
import InstructorPractice from "./pages/instructor/InstructorPractice.jsx";
import InstructorRoster from "./pages/instructor/InstructorRoster.jsx";
import InstructorContact from "./pages/instructor/Contact.jsx";

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route path="/" element={<Navigate to="/login" replace />} />

      <Route
        path="/student"
        element={
          <ProtectedRoute allowedRoles={["student"]}>
            <Navigate to="/student/courses" replace />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/courses"
        element={
          <ProtectedRoute allowedRoles={["student"]}>
            <AppLayout>
              <Courses />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/dashboard"
        element={
          <ProtectedRoute allowedRoles={["student"]}>
            <AppLayout>
              <Dashboard />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/assignments"
        element={
          <ProtectedRoute allowedRoles={["student"]}>
            <AppLayout>
              <Assignments />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/practice"
        element={
          <ProtectedRoute allowedRoles={["student"]}>
            <AppLayout>
              <Practice />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/profile"
        element={
          <ProtectedRoute allowedRoles={["student"]}>
            <AppLayout>
              <Profile />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/grades"
        element={
          <ProtectedRoute allowedRoles={["student"]}>
            <AppLayout>
              <Grades />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/contact"
        element={
          <ProtectedRoute allowedRoles={["student"]}>
            <AppLayout>
              <ContactStudent />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/student/assignment/:assignmentId"
        element={
          <ProtectedRoute allowedRoles={["student"]}>
            <AppLayout>
              <Worksheet />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/instructor"
        element={
          <ProtectedRoute allowedRoles={["instructor"]}>
            <Navigate to="/instructor/dashboard" replace />
          </ProtectedRoute>
        }
      />
      <Route
        path="/instructor/assignments"
        element={
          <ProtectedRoute allowedRoles={["instructor"]}>
            <AppLayout>
              <InstructorAssignments />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/instructor/dashboard"
        element={
          <ProtectedRoute allowedRoles={["instructor"]}>
            <AppLayout>
              <InstructorDashboard />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/instructor/courses"
        element={
          <ProtectedRoute allowedRoles={["instructor"]}>
            <AppLayout>
              <Courses />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/instructor/profile"
        element={
          <ProtectedRoute allowedRoles={["instructor"]}>
            <AppLayout>
              <Profile />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/instructor/gradebook"
        element={
          <ProtectedRoute allowedRoles={["instructor"]}>
            <AppLayout>
              <InstructorGradebook />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/instructor/controls"
        element={
          <ProtectedRoute allowedRoles={["instructor"]}>
            <AppLayout>
              <InstructorControls />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/instructor/practice"
        element={
          <ProtectedRoute allowedRoles={["instructor"]}>
            <AppLayout>
              <InstructorPractice />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/instructor/roster"
        element={
          <ProtectedRoute allowedRoles={["instructor"]}>
            <AppLayout>
              <InstructorRoster />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/instructor/contact"
        element={
          <ProtectedRoute allowedRoles={["instructor"]}>
            <AppLayout>
              <InstructorContact />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/instructor/assignment-builder"
        element={
          <ProtectedRoute allowedRoles={["instructor"]}>
            <AppLayout>
              <AssignmentBuilder />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

function AppContent() {
  const theme = useThemeState();
  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <ScrollToTop />
        <AuthProvider>
          <CoursesProvider>
            <LayoutProvider>
              <AppRoutes />
            </LayoutProvider>
          </CoursesProvider>
        </AuthProvider>
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

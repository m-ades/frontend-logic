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
import AppLayout from "./components/layout/AppLayout.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Worksheet from "./pages/Worksheet.jsx";
import Assignments from "./pages/Assignments.jsx";
import Practice from "./pages/Practice.jsx";
import Grades from "./pages/Grades.jsx";
import Contact from "./pages/Contact.jsx";
import Settings from "./pages/Settings.jsx";
import InstructorDashboard from "./pages/instructor/InstructorDashboard.jsx";
import InstructorGradebook from "./pages/instructor/InstructorGradebook.jsx";
import InstructorControls from "./pages/instructor/InstructorControls.jsx";
import InstructorCourses from "./pages/instructor/InstructorCourses.jsx";
import Login from "./pages/Login.jsx";

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Login />} />

      {/* Default route - redirect to login */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Student routes */}
      <Route
        path="/student"
        element={
          <ProtectedRoute allowedRoles={["student"]}>
            <Navigate to="/student/dashboard" replace />
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
              <Contact />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/settings"
        element={
          <ProtectedRoute allowedRoles={["student"]}>
            <AppLayout>
              <Settings />
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
        path="/student/worksheet/:worksheetId"
        element={
          <ProtectedRoute allowedRoles={["student"]}>
            <AppLayout>
              <Worksheet />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* Instructor routes */}
      <Route
        path="/instructor"
        element={
          <ProtectedRoute allowedRoles={["instructor"]}>
            <Navigate to="/instructor/dashboard" replace />
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
              <InstructorCourses />
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
        path="/instructor/settings"
        element={
          <ProtectedRoute allowedRoles={["instructor"]}>
            <AppLayout>
              <Settings />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/instructor/contact"
        element={
          <ProtectedRoute allowedRoles={["instructor"]}>
            <AppLayout>
              <Contact />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/instructor"
        element={
          <ProtectedRoute allowedRoles={["instructor"]}>
            <Navigate to="/instructor/courses" replace />
          </ProtectedRoute>
        }
      />
      {/* Catch all */}
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

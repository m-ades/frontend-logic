import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles'
import { CssBaseline } from '@mui/material'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext.jsx'
import { useThemeState } from './context/ThemeContext.jsx'
import { LayoutProvider } from './context/LayoutContext.jsx'
import ErrorBoundary from './components/ui/ErrorBoundary.jsx'
import AppLayout from './components/layout/AppLayout.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Worksheet from './pages/Worksheet.jsx'
import Assignments from './pages/Assignments.jsx'
import Practice from './pages/Practice.jsx'
import Grades from './pages/Grades.jsx'
import Contact from './pages/Contact.jsx'
import Settings from './pages/Settings.jsx'
import InstructorDashboard from './pages/instructor/InstructorDashboard.jsx'
import InstructorGradebook from './pages/instructor/InstructorGradebook.jsx'
import InstructorControls from './pages/instructor/InstructorControls.jsx'
import Login from './pages/Login.jsx'
import { getStoredUser } from './utils/api.js'

function RequireAuth({ children }) {
  const user = getStoredUser()
  if (!user) {
    return <Navigate to="/login" replace />
  }
  return children
}

function AppContent() {
  const theme = useThemeState()
  
  return (
    <>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        <BrowserRouter>
          <LayoutProvider>
            <Routes>
              <Route
                path="/"
                element={
                  <RequireAuth>
                    <AppLayout>
                      <Dashboard />
                    </AppLayout>
                  </RequireAuth>
                }
              />
              <Route
                path="/assignments"
                element={
                  <RequireAuth>
                    <AppLayout>
                      <Assignments />
                    </AppLayout>
                  </RequireAuth>
                }
              />
              <Route
                path="/practice"
                element={
                  <RequireAuth>
                    <AppLayout>
                      <Practice />
                    </AppLayout>
                  </RequireAuth>
                }
              />
              <Route
                path="/grades"
                element={
                  <RequireAuth>
                    <AppLayout>
                      <Grades />
                    </AppLayout>
                  </RequireAuth>
                }
              />
              <Route
                path="/contact"
                element={
                  <RequireAuth>
                    <AppLayout>
                      <Contact />
                    </AppLayout>
                  </RequireAuth>
                }
              />
              <Route
                path="/settings"
                element={
                  <RequireAuth>
                    <AppLayout>
                      <Settings />
                    </AppLayout>
                  </RequireAuth>
                }
              />
              <Route path="/login" element={<Login />} />
              <Route
                path="/assignment/:assignmentId"
                element={
                  <RequireAuth>
                    <AppLayout>
                      <Worksheet />
                    </AppLayout>
                  </RequireAuth>
                }
              />
              <Route
                path="/worksheet/:worksheetId"
                element={
                  <RequireAuth>
                    <AppLayout>
                      <Worksheet />
                    </AppLayout>
                  </RequireAuth>
                }
              />
              <Route
                path="/instructor/dashboard"
                element={
                  <RequireAuth>
                    <AppLayout>
                      <InstructorDashboard />
                    </AppLayout>
                  </RequireAuth>
                }
              />
              <Route
                path="/instructor/gradebook"
                element={
                  <RequireAuth>
                    <AppLayout>
                      <InstructorGradebook />
                    </AppLayout>
                  </RequireAuth>
                }
              />
              <Route
                path="/instructor/controls"
                element={
                  <RequireAuth>
                    <AppLayout>
                      <InstructorControls />
                    </AppLayout>
                  </RequireAuth>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </LayoutProvider>
        </BrowserRouter>
      </MuiThemeProvider>
    </>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </ErrorBoundary>
  )
}

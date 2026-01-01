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
                  <AppLayout>
                    <Dashboard />
                  </AppLayout>
                }
              />
              <Route
                path="/assignments"
                element={
                  <AppLayout>
                    <Assignments />
                  </AppLayout>
                }
              />
              <Route
                path="/practice"
                element={
                  <AppLayout>
                    <Practice />
                  </AppLayout>
                }
              />
              <Route
                path="/grades"
                element={
                  <AppLayout>
                    <Grades />
                  </AppLayout>
                }
              />
              <Route
                path="/contact"
                element={
                  <AppLayout>
                    <Contact />
                  </AppLayout>
                }
              />
              <Route
                path="/settings"
                element={
                  <AppLayout>
                    <Settings />
                  </AppLayout>
                }
              />
              <Route path="/login" element={<Login />} />
              <Route
                path="/assignment/:assignmentId"
                element={
                  <AppLayout>
                    <Worksheet />
                  </AppLayout>
                }
              />
              <Route
                path="/worksheet/:worksheetId"
                element={
                  <AppLayout>
                    <Worksheet />
                  </AppLayout>
                }
              />
              <Route
                path="/instructor/dashboard"
                element={
                  <AppLayout>
                    <InstructorDashboard />
                  </AppLayout>
                }
              />
              <Route
                path="/instructor/gradebook"
                element={
                  <AppLayout>
                    <InstructorGradebook />
                  </AppLayout>
                }
              />
              <Route
                path="/instructor/controls"
                element={
                  <AppLayout>
                    <InstructorControls />
                  </AppLayout>
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

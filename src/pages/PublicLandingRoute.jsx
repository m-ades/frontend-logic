import { Navigate } from 'react-router-dom'
import { Box } from '@mui/material'
import { useAuthState } from '@/context/AuthContext'
import { normalizeRole } from '@/utils/auth'
import LoadingSpinner from '@/components/ui/LoadingSpinner.jsx'
import Landing from './Landing.jsx'

/**
 * `/` — landing page for guests; logged-in users go straight to their dashboard.
 * Session is restored from `localStorage` (`logicapp_current_user`) via `AuthProvider`.
 */
export default function PublicLandingRoute() {
  const { isAuthenticated, user, isLoading } = useAuthState()

  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
        }}
      >
        <LoadingSpinner label="Loading..." />
      </Box>
    )
  }

  if (isAuthenticated) {
    const role = normalizeRole(user?.role)
    if (role === 'instructor') {
      return <Navigate to="/instructor/dashboard" replace />
    }
    if (role === 'student') {
      return <Navigate to="/student/dashboard" replace />
    }
    return <Navigate to="/login" replace />
  }

  return <Landing />
}

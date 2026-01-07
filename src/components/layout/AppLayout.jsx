import { Box, Toolbar } from '@mui/material'
import Header from './Header.jsx'
import Sidebar from './Sidebar.jsx'
import SidebarStructure from './SidebarStructure.jsx'
import { useLocation, useNavigate } from 'react-router-dom'
import { fetchJson } from '../../utils/api.js'

export default function AppLayout({ children }) {
  const location = useLocation()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    try {
      await fetchJson('/api/auth/logout', { method: 'POST' })
    } catch (error) {
      console.warn('Signing out failed', error)
    } finally {
      navigate('/login')
    }
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Header onSignOut={handleSignOut} />
      <Sidebar structure={SidebarStructure} location={location} />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { xs: '100%', md: 'auto' },
          backgroundColor: 'background.default',
          minHeight: '100vh',
          overflow: 'auto',
        }}
      >
        <Toolbar />
        {children}
      </Box>
    </Box>
  )
}

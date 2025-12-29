import { Box, Toolbar } from '@mui/material'
import Header from './Header.jsx'
import Sidebar from './Sidebar.jsx'
import SidebarStructure from './SidebarStructure.jsx'
import { useLocation } from 'react-router-dom'

export default function AppLayout({ children }) {
  const location = useLocation()

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Header />
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


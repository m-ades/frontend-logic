import {
  Box,
  Typography,
  CardContent,
  Stack,
  Switch,
  FormControlLabel,
  Divider,
  TextField,
  Button,
  Alert,
  IconButton,
  InputAdornment,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Chip,
  Dialog,          
  DialogTitle,     
  DialogContent,   
  DialogActions    
} from '@mui/material'
import ThemedCard from '../components/ui/ThemedCard.jsx'
import { useThemeState, useThemeDispatch } from '../context/ThemeContext.jsx'
import { useState, useEffect } from 'react'
import { Visibility, VisibilityOff } from '@mui/icons-material'
import ComputerIcon from '@mui/icons-material/Computer'
import SmartphoneIcon from '@mui/icons-material/Smartphone'
import TabletIcon from '@mui/icons-material/Tablet'
import DesktopWindowsIcon from '@mui/icons-material/DesktopWindows'
import LaptopIcon from '@mui/icons-material/Laptop'
import LogoutIcon from '@mui/icons-material/Logout'
import DeleteIcon from '@mui/icons-material/Delete'
import WarningIcon from '@mui/icons-material/Warning'

export default function Settings() {
  const theme = useThemeState()
  const changeTheme = useThemeDispatch()
  const isDark = theme.palette.mode === 'dark'

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState({})
  const [submitSuccess, setSubmitSuccess] = useState(false)
  
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [passwordStrength, setPasswordStrength] = useState(0)

  const handleThemeToggle = () => {
    changeTheme(isDark ? 'default' : 'dark')
  }

  const [confirmationDialog, setConfirmationDialog] = useState({
    open: false,
    type: '', 
    deviceId: null,
    deviceName: ''
  })

  //mock data for devices 
  const [devices, setDevices] = useState([
    {
      id: '1',
      name: 'MacBook Pro',
      type: 'laptop',
      os: 'macOS',
      browser: 'Chrome',
      location: 'San Francisco, CA',
      lastActive: '2 hours ago',
      currentDevice: true,
      ip: '192.168.1.100'
    },
    {
      id: '2',
      name: 'iPhone 13',
      type: 'mobile',
      os: 'iOS',
      browser: 'Safari',
      location: 'San Francisco, CA',
      lastActive: '1 day ago',
      currentDevice: false,
      ip: '192.168.1.101'
    },
    {
      id: '3',
      name: 'Windows Desktop',
      type: 'desktop',
      os: 'Windows 11',
      browser: 'Firefox',
      location: 'New York, NY',
      lastActive: '3 days ago',
      currentDevice: false,
      ip: '203.0.113.5'
    },
    {
      id: '4',
      name: 'iPad Pro',
      type: 'tablet',
      os: 'iPadOS',
      browser: 'Safari',
      location: 'Los Angeles, CA',
      lastActive: '1 week ago',
      currentDevice: false,
      ip: '198.51.100.1'
    }
  ])

  const [logoutSuccess, setLogoutSuccess] = useState(false)
  const [logoutError, setLogoutError] = useState('')

  const calculatePasswordStrength = (password) => {
    if (!password || password.length < 6) return 0
    
    let score = 0
    
    if (password.length >= 6) score += 1
    
    const hasLower = /[a-z]/.test(password)
    const hasUpper = /[A-Z]/.test(password)
    const hasDigit = /\d/.test(password)
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password)
    
    let varietyScore = 0
    if (hasLower) varietyScore++
    if (hasUpper) varietyScore++
    if (hasDigit) varietyScore++
    if (hasSpecial) varietyScore++
    
    if (varietyScore >= 2) score += 1
    if (varietyScore >= 4) score += 1
    
    return Math.min(score, 3)
  }

  useEffect(() => {
    const strength = calculatePasswordStrength(newPassword)
    setPasswordStrength(strength)
  }, [newPassword])

  const getStrengthInfo = (strength) => {
    switch(strength) {
      case 0: return { label: '', color: 'grey.300', textColor: 'text.disabled' }
      case 1: return { label: 'Low', color: '#f44336', textColor: 'error.main' }
      case 2: return { label: 'Medium', color: '#ff9800', textColor: 'warning.main' }
      case 3: return { label: 'High', color: '#4caf50', textColor: 'success.main' }
      default: return { label: '', color: 'grey.300', textColor: 'text.disabled' }
    }
  }

  const strengthInfo = getStrengthInfo(passwordStrength)

  const validateForm = () => {
    const newErrors = {}

    if (!currentPassword.trim()) {
      newErrors.currentPassword = 'Current password is required'
    } else if (currentPassword !== 'demo123') {   //Mock password
      newErrors.currentPassword = 'Wrong current password'
    }

    if (newPassword.length < 6) {
      newErrors.newPassword = 'Password must be at least 6 characters'
    }

    if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }

    if (currentPassword && newPassword && currentPassword === newPassword) {
      newErrors.newPassword = 'New password must be different from current password'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handlePasswordSubmit = (e) => {
    e.preventDefault()
    setSubmitSuccess(false)

    if (validateForm()) {  //need to be implemented with backend
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setErrors({})
      setSubmitSuccess(true)

      setTimeout(() => {
        setSubmitSuccess(false)
      }, 3000)
    }
  }

  const clearError = (field) => {
    setErrors(prev => ({
      ...prev,
      [field]: undefined
    }))
  }

  const getDeviceIcon = (type) => {
    switch(type) {
      case 'laptop':
        return <LaptopIcon />
      case 'mobile':
        return <SmartphoneIcon />
      case 'tablet':
        return <TabletIcon />
      case 'desktop':
        return <DesktopWindowsIcon />
      default:
        return <ComputerIcon />
    }
  }

  const openSingleLogoutDialog = (deviceId, deviceName) => {
    setConfirmationDialog({
      open: true,
      type: 'single',
      deviceId,
      deviceName
    })
  }

  const openAllLogoutDialog = () => {
    setConfirmationDialog({
      open: true,
      type: 'all',
      deviceId: null,
      deviceName: ''
    })
  }

  const closeConfirmationDialog = () => {
    setConfirmationDialog(prev => ({
      ...prev,
      open: false
    }))
    
    setTimeout(() => {
      setConfirmationDialog({
        open: false,
        type: '',
        deviceId: null,
        deviceName: ''
      })
    }, 150) 
  }

  const handleConfirmLogoutDevice = () => {
    const { deviceId } = confirmationDialog
    
    //need to be implemented with backend
    setDevices(prev => prev.filter(device => device.id !== deviceId))
    
    setLogoutSuccess(true)
    closeConfirmationDialog()
    
    setTimeout(() => {
      setLogoutSuccess(false)
    }, 3000)
  }

  const handleConfirmLogoutAllDevices = () => {
    //need to be implemented with backend
    setDevices(prev => prev.filter(device => device.currentDevice))
    
    setLogoutSuccess(true)
    closeConfirmationDialog()
    
    setTimeout(() => {
      setLogoutSuccess(false)
    }, 3000)
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 600 }}>
        Settings
      </Typography>

      <ThemedCard sx={{ mb: 3 }}>
        <CardContent>
          <Stack spacing={3}>
            <Typography variant="h6">Appearance</Typography>
            <Divider />
            <FormControlLabel
              control={
                <Switch
                  checked={isDark}
                  onChange={handleThemeToggle}
                  color="primary"
                />
              }
              label="Dark Mode"
            />
          </Stack>
        </CardContent>
      </ThemedCard>

      <ThemedCard sx={{ mb: 3 }}>
        <CardContent>
          <Stack spacing={3}>
            <Typography variant="h6">Change Password</Typography>
            <Divider />
            
            {submitSuccess && (
              <Alert
                severity="info"
                sx={{
                  mb: 2,
                  bgcolor: "background.paper",
                  color: "text.primary",
                  border: "1px solid",
                  borderColor: "primary.main",
                  "& .MuiAlert-icon": { color: "primary.main" },
                }}
              >
                Password changed successfully! (This is a demo — no actual change occurred)
              </Alert>
            )}

            <Box component="form" onSubmit={handlePasswordSubmit}>
              <Stack spacing={2}>
                <TextField
                  fullWidth
                  label="Current Password"
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => {
                    setCurrentPassword(e.target.value)
                    clearError('currentPassword')
                  }}
                  error={!!errors.currentPassword}
                  helperText={errors.currentPassword || " "}
                  required
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowCurrentPassword((prev) => !prev)}
                          edge="end"
                          aria-label="toggle current password visibility"
                          sx={{ 
                            color: 'text.secondary',
                            marginRight: '2px'
                          }}
                        >
                          {showCurrentPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                  sx={{ mb: 0.5 }}
                />

                <TextField
                  fullWidth
                  label="New Password"
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value)
                    clearError('newPassword')
                  }}
                  error={!!errors.newPassword}
                  helperText={errors.newPassword || "At least 6 characters"}
                  required
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowNewPassword((prev) => !prev)}
                          edge="end"
                          aria-label="toggle new password visibility"
                          sx={{ 
                            color: 'text.secondary',
                            marginRight: '2px' 
                          }}
                        >
                          {showNewPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                  sx={{ mb: 0.5 }}
                />

                <TextField
                  fullWidth
                  label="Confirm New Password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value)
                    clearError('confirmPassword')
                  }}
                  error={!!errors.confirmPassword}
                  helperText={errors.confirmPassword || " "}
                  required
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowConfirmPassword((prev) => !prev)}
                          edge="end"
                          aria-label="toggle confirm password visibility"
                          sx={{ 
                            color: 'text.secondary',
                            marginRight: '2px' 
                          }}
                        >
                          {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                  sx={{ mb: 0.5 }}
                />

                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 2,
                  pt: 1
                }}>
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 1.5, 
                    flexGrow: 1,
                    ml: 1.5
                  }}>
                    <Typography variant="body2" color="text.secondary">
                      Strength:
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {[1, 2, 3].map((level) => (
                        <Box
                          key={level}
                          sx={{
                            width: 24,
                            height: 8,
                            borderRadius: 1,
                            backgroundColor: level <= passwordStrength ? strengthInfo.color : 'grey.300',
                            transition: 'background-color 0.3s',
                            boxShadow: level <= passwordStrength ? 1 : 0
                          }}
                        />
                      ))}
                    </Box>
                    <Typography 
                      variant="body2"
                      sx={{ 
                        fontWeight: 'medium',
                        color: strengthInfo.textColor,
                        minWidth: 60,
                        textAlign: 'center'
                      }}
                    >
                      {strengthInfo.label}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button
                      variant="outlined"
                      onClick={() => {
                        setCurrentPassword('')
                        setNewPassword('')
                        setConfirmPassword('')
                        setErrors({})
                      }}
                    >
                      Clear
                    </Button>
                    <Button
                      type="submit"
                      variant="contained"
                      color="primary"
                    >
                      Change Password
                    </Button>
                  </Box>
                </Box>
              </Stack>
            </Box>
          </Stack>
        </CardContent>
      </ThemedCard>

      <ThemedCard>
        <CardContent>
          <Stack spacing={3}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6">Active Devices</Typography>
              <Button
                variant="outlined"
                color="error"
                startIcon={<LogoutIcon />}
                onClick={openAllLogoutDialog}
                size="small"
              >
                Log out of all devices to end active sessions
              </Button>
            </Box>
            <Divider />
            
            {logoutSuccess && (
              <Alert severity="success" sx={{ mb: 2 }}>
                Device logged out successfully!
              </Alert>
            )}
            
            {logoutError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {logoutError}
              </Alert>
            )}
            
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Manage devices that are logged into your account. You'll be logged out from any device you remove.
            </Typography>
            
            <List>
              {devices.map((device) => (
                <ListItem
                  key={device.id}
                  sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    mb: 1,
                    bgcolor: device.currentDevice ? 'action.hover' : 'transparent'
                  }}
                >
                  <ListItemIcon>
                    {getDeviceIcon(device.type)}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body1" fontWeight="medium">
                          {device.name}
                        </Typography>
                        {device.currentDevice && (
                          <Chip
                            label="This device"
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        )}
                      </Box>
                    }
                    secondary={
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mt: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">
                          {device.browser} on {device.os}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {device.location} • {device.lastActive}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          IP: {device.ip}
                        </Typography>
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    {!device.currentDevice && (
                      <IconButton
                        edge="end"
                        aria-label="logout device"
                        onClick={() => openSingleLogoutDialog(device.id, device.name)}
                        color="error"
                        size="small"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    )}
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
            
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="text"
                size="small"
                onClick={() => {}}
              >
                Refresh list
              </Button>
            </Box>
          </Stack>
        </CardContent>
      </ThemedCard>

      <Dialog
        open={confirmationDialog.open}
        onClose={closeConfirmationDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningIcon color="warning" />
          Confirm Logout
        </DialogTitle>
        <DialogContent>
          {confirmationDialog.type === 'single' ? (
            <Typography variant="body1">
              Are you sure you want to log out from <strong>{confirmationDialog.deviceName}</strong>?
              You will need to log in again on that device.
            </Typography>
          ) : (
            <Typography variant="body1">
              Are you sure you want to log out from <strong>all devices</strong> except this one?
              You will need to log in again on all other devices.
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 2 }}>
          <Button onClick={closeConfirmationDialog} variant="outlined">
            Cancel
          </Button>
          <Button 
            onClick={
              confirmationDialog.type === 'single' 
                ? handleConfirmLogoutDevice 
                : handleConfirmLogoutAllDevices
            } 
            variant="contained" 
            color="error"
          >
            Yes, Log Out
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

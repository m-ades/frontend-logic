import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  CardContent,
  Button,
  TextField,
  IconButton,
  Alert,
  FormControlLabel,
  Checkbox,
  InputAdornment,
  Tooltip
} from '@mui/material';
import { Person, LockOutlined, Visibility, VisibilityOff, DarkMode, LightMode } from '@mui/icons-material';
import ThemedCard from '../components/ui/ThemedCard.jsx';
import { useThemeState, useThemeDispatch } from '../context/ThemeContext.jsx';
import { API_CONFIG, fetchJson, setStoredUser } from '../utils/api.js';
import { useAuthState, useAuthDispatch, login } from '../context/AuthContext';
import { isInstructorRole } from '../utils/auth.js';

export default function Login() {
  const navigate = useNavigate();
  const theme = useThemeState();
  const changeTheme = useThemeDispatch();
  const isDark = theme.palette.mode === 'dark';
  const dispatch = useAuthDispatch();
  const { isAuthenticated, user, isLoading: authLoading } = useAuthState();
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleThemeToggle = () => {
    changeTheme(isDark ? 'default' : 'dark');
  };

  useEffect(() => {
    if (!authLoading && isAuthenticated && user) {
      if (isInstructorRole(user.role)) {
        navigate('/instructor/dashboard', { replace: true });
      } else {
        navigate('/student/courses', { replace: true });
      }
    }
  }, [authLoading, isAuthenticated, user, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await fetchJson('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      let role = 'student';
      try {
        if (data?.user?.is_system_admin) {
          role = 'instructor';
        } else {
          const enrollments = await fetchJson('/api/course-enrollments');
          const hasInstructor = (enrollments || []).some((e) => e.role === 'instructor');
          const hasTa = (enrollments || []).some((e) => e.role === 'ta');
          if (hasInstructor) {
            role = 'instructor';
          } else if (hasTa) {
            role = 'ta';
          }
        }
      } catch (enrollmentError) {
        console.warn('Failed to load enrollments for role routing', enrollmentError);
      }

      const userWithRole = { ...data?.user, role };
      setStoredUser(userWithRole);
      login(dispatch, userWithRole);
      navigate(role === 'instructor' ? '/instructor/dashboard' : '/student/courses');
    } catch (err) {
      setError(err?.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || isAuthenticated) {
    return null;
  }

  return (
    <Box 
      sx={{ 
        minHeight: '100vh',
        backgroundColor: isDark ? theme.palette.background.default : '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: 4,
        position: 'relative'
      }}
    >

      <Box
        sx={{
          position: 'absolute',
          top: 20,
          right: 20,
          zIndex: 1000
        }}
      >
        <Tooltip title={isDark ? "Switch to light mode" : "Switch to dark mode"}>
          <IconButton
            onClick={handleThemeToggle}
            sx={{
              color: isDark ? theme.palette.text.primary : '#1d4ed8',
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(29, 78, 216, 0.1)',
              '&:hover': {
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(29, 78, 216, 0.2)',
              },
              p: 1.5,
              boxShadow: isDark ? '0 4px 12px rgba(0, 0, 0, 0.3)' : '0 4px 12px rgba(29, 78, 216, 0.2)'
            }}
          >
            {isDark ? <LightMode /> : <DarkMode />}
          </IconButton>
        </Tooltip>
      </Box>

      <Box sx={{ maxWidth: 480, width: '100%', px: 2 }}>
        <Typography 
          variant="h1"
          sx={{ 
            mb: 3,
            fontWeight: 900,
            textAlign: 'center',
            color: '#1d4ed8',
            textShadow: isDark ? '0 4px 8px rgba(55, 66, 166, 1)' : '0 4px 8px rgba(0,0,0,0.1)',
            fontSize: { xs: '2.5rem', sm: '3.5rem', md: '5rem' },
            whiteSpace: 'nowrap'
          }}
        >
          Hunter Logic
        </Typography>
        
        <Typography 
          variant="h5"
          sx={{ 
            mb: 5,
            textAlign: 'center',
            fontWeight: 600,
            fontSize: { xs: '1.25rem', sm: '1.5rem' },
            color: isDark ? theme.palette.text.secondary : '#1e40af'
          }}
        >
          Sign in to your account
        </Typography>

        <ThemedCard
          sx={{
            backdropFilter: 'blur(10px)',
            backgroundColor: isDark ? theme.palette.background.paper : 'rgba(255, 255, 255, 0.92)',
            border: isDark ? `2px solid ${theme.palette.divider}` : '1px solid rgba(29, 78, 216, 0.25)',
            boxShadow: isDark ? '0 4px 8px rgba(65, 77, 192, 1)' : '0 12px 40px rgba(29, 78, 216, 0.2)',
            borderRadius: 3
          }}
        >
          <CardContent>
            <form onSubmit={handleLogin}>
              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}
              
              <TextField
                fullWidth
                label="Username"
                variant="outlined"
                margin="normal"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Person fontSize="small" sx={{ color: theme.palette.primary.main }} />
                    </InputAdornment>
                  )
                }}
                sx={{
                  mb: 1,
                  '& .MuiOutlinedInput-root': {
                    '&:hover fieldset': {
                      borderColor: theme.palette.primary.main,
                    },
                  },
                  '& .MuiInputLabel-root': {
                    color: isDark ? theme.palette.text.secondary : undefined,
                  }
                }}
                required
              />
              
              <TextField
                fullWidth
                label="Password"
                type={showPassword ? 'text' : 'password'}
                variant="outlined"
                margin="normal"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockOutlined fontSize="small" sx={{ color: theme.palette.primary.main }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword((prev) => !prev)}
                        edge="end"
                        aria-label="toggle password visibility"
                        sx={{ color: theme.palette.primary.main }}
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    '&:hover fieldset': {
                      borderColor: theme.palette.primary.main,
                    },
                  },
                  '& .MuiInputLabel-root': {
                    color: isDark ? theme.palette.text.secondary : undefined,
                  }
                }}
                required
              />

              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', mb: 3 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      sx={{ 
                        color: theme.palette.primary.main,
                        '&.Mui-checked': {
                          color: theme.palette.primary.main,
                        },
                      }}
                      size="small"
                    />
                  }
                  label="Remember me"
                  sx={{ 
                    color: isDark ? theme.palette.text.secondary : '#1e40af', 
                    userSelect: 'none' 
                  }}
                />
              </Box>

              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={loading}
                sx={{ 
                  backgroundColor: theme.palette.primary.main,
                  background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
                  '&:hover': {
                    backgroundColor: theme.palette.primary.dark,
                    background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.light} 100%)`,
                    boxShadow: theme.customShadows?.widgetWide
                  },
                  py: 1.5,
                  fontWeight: 600,
                  fontSize: '1rem',
                  boxShadow: theme.customShadows?.widget
                }}
              >
                {loading ? 'Logging in...' : 'Log In'}
              </Button>
            </form>
          </CardContent>
        </ThemedCard>
      </Box>

      <Typography 
        variant="body2" 
        sx={{ 
          position: 'absolute',
          bottom: 20,
          left: 0,
          right: 0,
          textAlign: 'center',
          color: isDark ? theme.palette.text.primary : '#1e40af',
          py: 1.5,
          px: 2,
          fontWeight: 500,
          backdropFilter: 'blur(4px)'
        }}
      >
        If you forget your username and/or password, please contact your instructor
      </Typography>
    </Box>
  );
}

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Typography, CardContent, TextField, Button, Alert, Stack } from '@mui/material'
import ThemedCard from '../components/ui/ThemedCard.jsx'
import { API_CONFIG, fetchJson, setStoredUser } from '../utils/api.js'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)
    try {
      const data = await fetchJson('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      setStoredUser(data?.user)
      let landingPath = '/'
      try {
        const enrollments = await fetchJson('/api/course-enrollments')
        const courseEnrollment = (enrollments || []).find(
          (enrollment) => Number(enrollment.course_id) === Number(API_CONFIG.courseId)
        )
        if (courseEnrollment && ['instructor', 'ta'].includes(courseEnrollment.role)) {
          landingPath = '/instructor/dashboard'
        }
      } catch (enrollmentError) {
        console.warn('Failed to load enrollments for role routing', enrollmentError)
      }
      navigate(landingPath)
    } catch (err) {
      setError(err?.message || 'Login failed.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Box sx={{ maxWidth: 480, mx: 'auto', mt: 8 }}>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 600, textAlign: 'center' }}>
        Login
      </Typography>

      <ThemedCard>
        <CardContent>
          <Box component="form" onSubmit={handleSubmit}>
            <Stack spacing={2}>
              {error && <Alert severity="error">{error}</Alert>}
              <TextField
                label="Username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoComplete="username"
                required
              />
              <TextField
                label="Password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
              <Button type="submit" variant="contained" disabled={isSubmitting}>
                {isSubmitting ? 'Signing in...' : 'Sign in'}
              </Button>
            </Stack>
          </Box>
        </CardContent>
      </ThemedCard>
    </Box>
  )
}

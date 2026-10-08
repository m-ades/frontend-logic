// safety net to prevent ui from crashing if a component 
// throws a runtime error/bad render/crashes

import React from 'react'
import { Alert, Box, Typography, Button } from '@mui/material'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
  }

  // clears an error that was already showing once the reset key moves
  componentDidUpdate(prevProps, prevState) {
    if (prevState.hasError && this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false, error: null })
    }
  }

  render() {
    if (this.state.hasError && this.props.scoped) {
      return (
        <Alert
          severity="error"
          sx={{ m: 2 }}
          action={(
            <Button color="inherit" size="small" onClick={() => this.setState({ hasError: false, error: null })}>
              Try again
            </Button>
          )}
        >
          {this.props.message ?? 'This section failed to load.'}
          <Typography variant="caption" component="div">
            {this.state.error?.toString()}
          </Typography>
        </Alert>
      )
    }

    if (this.state.hasError) {
      return (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h5" component="h1" gutterBottom>
            Something went wrong
          </Typography>
          <Typography variant="body2" color="error" sx={{ mb: 2 }}>
            {this.state.error?.toString()}
          </Typography>
          <Button
            variant="contained"
            onClick={() => {
              this.setState({ hasError: false, error: null })
              window.location.reload()
            }}
          >
            Reload Page
          </Button>
        </Box>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary

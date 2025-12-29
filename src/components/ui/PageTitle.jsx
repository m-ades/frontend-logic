import { Button, Box } from '@mui/material'
import { Typography } from '@mui/material'

export default function PageTitle({ title, button, buttonAction }) {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: 4,
        marginTop: 5,
      }}
    >
      <Typography
        variant="h1"
        sx={{
          fontSize: '1.5rem',
          fontWeight: 500,
          color: 'text.hint',
        }}
      >
        {title}
      </Typography>
      {button && (
        <Button
          variant="contained"
          size="large"
          color="secondary"
          onClick={buttonAction}
          sx={{
            boxShadow: (theme) => theme.customShadows?.widget || '0 1px 3px rgba(0,0,0,0.12)',
            textTransform: 'none',
            '&:active': {
              boxShadow: (theme) => theme.customShadows?.widgetWide || '0 2px 6px rgba(0,0,0,0.15)',
            },
          }}
        >
          {button}
        </Button>
      )}
    </Box>
  )
}


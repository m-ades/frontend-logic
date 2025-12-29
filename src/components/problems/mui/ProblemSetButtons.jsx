import { Button, Stack } from '@mui/material'

// shared button component is 'submit answer' and 'start over' for now
export default function ProblemSetButtons({ 
  onCheck, 
  onStartOver, 
  isChecking = false, 
  isDisabled = false,
  sx = {} 
}) {
  return (
    <Stack 
      direction="row" 
      spacing={2} 
      justifyContent="center" 
      sx={{ mt: 3, ...sx }}
    >
      <Button
        variant="contained"
        onClick={onCheck}
        disabled={isChecking || isDisabled}
        sx={{ minWidth: 120 }}
      >
        {isChecking ? 'Submitting...' : 'Submit Answer'}
      </Button>
      <Button
        variant="outlined"
        onClick={onStartOver}
        disabled={isChecking}
      >
        Start Over
      </Button>
    </Stack>
  )
}

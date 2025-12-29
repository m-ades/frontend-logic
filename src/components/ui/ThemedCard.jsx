// only use this card 

import { forwardRef } from 'react'
import Card from '@mui/material/Card'

const ThemedCard = forwardRef(function ThemedCard({ sx, elevation, ...props }, ref) {
  const baseSx = (theme) => ({
    boxShadow: theme.customShadows?.widget || theme.shadows[2],
    backgroundColor: theme.palette.background.paper,
  })

  return (
    <Card
      ref={ref}
      elevation={elevation ?? 0}
      sx={[baseSx, sx]}
      {...props}
    />
  )
})

export default ThemedCard

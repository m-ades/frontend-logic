import { useMediaQuery } from '@mui/material'

// narrow screens, plus phones turned sideways (short and touch)
export default function useIsPhone() {
  return useMediaQuery('(max-width: 599.95px), (max-height: 599.95px) and (pointer: coarse)')
}

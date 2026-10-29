import { useMediaQuery, useTheme } from '@mui/material'

/*
true for a phone-sized viewport in either orientation.

breakpoints.down('sm') on its own only catches portrait: an iPhone 12 turned
sideways is 844px wide, so it read as a desktop and the custom logic keyboard
was replaced by the native one mid-proof. a landscape phone is recognised by its
short viewport instead, and the coarse-pointer check keeps a short desktop
window on the desktop layout.
*/
export default function useIsPhone() {
  const theme = useTheme()
  const isNarrow = useMediaQuery(theme.breakpoints.down('sm'))
  const isLandscapePhone = useMediaQuery(
    '(max-height: 599.95px) and (orientation: landscape) and (pointer: coarse)'
  )
  return isNarrow || isLandscapePhone
}

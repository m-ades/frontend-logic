import { Typography } from '@mui/material'
import { sanitizeRichHtml } from '../../utils/sanitizeRichHtml.js'

const defaultSx = {
  width: '100%',
  maxWidth: '100%',
  minWidth: 0,
  wordBreak: 'break-word',
  overflowWrap: 'break-word',
  whiteSpace: 'normal',
  boxSizing: 'border-box',
  '& *': {
    maxWidth: '100%',
    minWidth: 0,
    wordBreak: 'break-word',
    overflowWrap: 'break-word',
    whiteSpace: 'normal',
    boxSizing: 'border-box',
  },
  '& div': {
    maxWidth: '100%',
    minWidth: 0,
    wordBreak: 'break-word',
    overflowWrap: 'break-word',
    whiteSpace: 'normal',
  },
  '& p': {
    maxWidth: '100%',
    minWidth: 0,
    wordBreak: 'break-word',
    overflowWrap: 'break-word',
    whiteSpace: 'normal',
  },
}

export default function RichText({ content, variant = 'body1', sx, ...props }) {
  if (!content) return null
  const hasHtml = typeof content === 'string' && /<[^>]+>/.test(content)
  const safeHtml = hasHtml ? sanitizeRichHtml(content) : ''
  const mergedSx = Array.isArray(sx)
    ? [defaultSx, ...sx]
    : (sx ? { ...defaultSx, ...sx } : defaultSx)

  if (hasHtml) {
    return (
      <Typography
        variant={variant}
        sx={mergedSx}
        // sanitize before render
        dangerouslySetInnerHTML={{ __html: safeHtml }}
        {...props}
      />
    )
  }
  return (
    <Typography variant={variant} sx={mergedSx} {...props}>
      {content}
    </Typography>
  )
}

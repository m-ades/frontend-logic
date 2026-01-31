import RichText from './RichText.jsx'

const promptSx = {
  fontSize: { xs: '0.95rem', md: '1rem' },
  lineHeight: 2,
  fontWeight: 400,
  color: 'text.primary',
  '& *': {
    fontSize: 'inherit !important',
    lineHeight: 'inherit',
    fontWeight: 'inherit !important',
    fontStyle: 'inherit !important',
    color: 'inherit !important',
  },
  '& p, & div': {
    margin: 0,
    marginBottom: '0.75rem',
  },
  '& p:last-of-type, & div:last-of-type': {
    marginBottom: 0,
  },
  '& div + div, & div + p, & p + div, & p + p': {
    marginTop: '1.5rem !important',
  },
  '& h1, & h2, & h3, & h4, & h5, & h6': {
    fontSize: 'inherit',
    fontWeight: 500,
    margin: 0,
    marginBottom: '0.75rem',
  },
  '& strong, & b': {
    fontWeight: '500 !important',
  },
  '& .instructions, & .instruction': {
    fontWeight: '400 !important',
  },
  '& .instructions::before, & .instruction::before': {
    content: '"Instructions: "',
    fontStyle: 'normal',
    color: 'text.secondary',
  },
  '& .instructions, & .instruction, & div.instructions, & div.instruction, & p.instructions, & p.instruction': {
    marginBottom: 0,
    paddingBottom: '0.5rem !important',
    display: 'block',
  },
  '& .instructions + *, & .instruction + *': {
    marginTop: '0 !important',
  },
  '& em, & i': {
    fontStyle: 'normal !important',
  },
}

export default function PromptText({ content, variant = 'body1', sx, ...props }) {
  if (!content) return null
  const sxList = Array.isArray(sx) ? sx : (sx ? [sx] : [])
  const hasFontSizeOverride = sxList.some(
    (item) => item && typeof item === 'object' && Object.prototype.hasOwnProperty.call(item, 'fontSize')
  )
  const baseSx = hasFontSizeOverride ? { ...promptSx, fontSize: 'inherit' } : promptSx
  const mergedSx = sxList.length ? [baseSx, ...sxList] : baseSx
  return (
    <RichText
      content={content}
      variant={variant}
      sx={mergedSx}
      component="div"
      {...props}
    />
  )
}

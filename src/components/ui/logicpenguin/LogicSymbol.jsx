import { Box } from '@mui/material'

const SYMBOL_SPEECH = {
  '~': 'tilde',
  '•': 'dot',
  '∨': 'wedge',
  '⊃': 'horseshoe',
  '≡': 'triple bar',
  '∀': 'universal quantifier',
  '∃': 'existential quantifier',
}

const EXPR_SPEECH = {
  '∀x': 'universal quantifier x',
  '∃x': 'existential quantifier x',
  '(∀x)': 'universal quantifier x',
  '(∃x)': 'existential quantifier x',
  '()': 'parentheses',
  '[]': 'brackets',
}

const PUNCT_SPEECH = {
  '(': 'left parenthesis',
  ')': 'right parenthesis',
  '[': 'left bracket',
  ']': 'right bracket',
  '{': 'left brace',
  '}': 'right brace',
  '/': 'slash',
}

const getSymbolSpeech = (symbol) => {
  if (!symbol) return ''
  return SYMBOL_SPEECH[symbol] || ''
}

export const getTokenSpeechLabel = (token) => {
  const raw = String(token ?? '')
  const trimmed = raw.trim()
  if (!trimmed) return raw
  const expressionSpeech = EXPR_SPEECH[trimmed]
  if (expressionSpeech) return expressionSpeech

  const spoken = []
  for (const ch of trimmed) {
    if (ch === ' ') continue
    const symbolSpeech = getSymbolSpeech(ch)
    if (symbolSpeech) {
      spoken.push(symbolSpeech)
      continue
    }
    const punctSpeech = PUNCT_SPEECH[ch]
    if (punctSpeech) {
      spoken.push(punctSpeech)
      continue
    }
    if (/^[A-Za-z]$/.test(ch)) {
      spoken.push(`letter ${ch.toUpperCase()}`)
      continue
    }
    spoken.push(ch)
  }

  return spoken.length > 0 ? spoken.join(' ') : trimmed
}

export const getInsertSymbolLabel = ({ insert, pair } = {}) => {
  if (pair) {
    const pairSpeech = EXPR_SPEECH[pair]
    return pairSpeech ? `Insert ${pairSpeech}` : `Insert ${pair}`
  }
  if (!insert) return 'Insert symbol'
  const expressionSpeech = EXPR_SPEECH[insert]
  if (expressionSpeech) return `Insert ${expressionSpeech}`
  if (/^[A-Za-z]$/.test(insert)) return `Insert letter ${insert.toUpperCase()}`
  const symbolSpeech = getSymbolSpeech(insert)
  if (symbolSpeech) return `Insert ${symbolSpeech}`
  return `Insert ${insert}`
}

export default function LogicSymbol({ symbol, component = 'span', sx }) {
  const expressionSpeech = EXPR_SPEECH[symbol]
  const symbolSpeech = expressionSpeech || getTokenSpeechLabel(symbol)
  return (
    <Box component={component} role="text" aria-label={symbolSpeech} sx={sx}>
      <Box component="span" aria-hidden="true">{symbol}</Box>
    </Box>
  )
}

import {
  displayIndexedSymbolsForNotation,
  normalizeIndexedSymbols,
} from '../../../lib/indexedSymbols.js'

const THEREFORE_BUTTON = { insert: ' ∴ ', label: '∴' }
const SLASH_BUTTONS = [{ insert: '/' }, { insert: '//' }]

// the phone logic keyboard has no comma key so comma separated arguments add one there
export const THEREFORE_SEPARATOR_BUTTONS = Object.freeze({
  desktop: [THEREFORE_BUTTON],
  mobile: [THEREFORE_BUTTON, { insert: ',', label: ',' }],
})

export const SLASH_SEPARATOR_BUTTONS = Object.freeze({
  desktop: SLASH_BUTTONS,
  mobile: SLASH_BUTTONS,
})

function getQuantifierButtonsFromFormulas(premises, conclusion, syntax) {
  const text = [...(Array.isArray(premises) ? premises : []), conclusion]
    .filter(Boolean)
    .join(' ')
  const seen = new Set([
    syntax.mkquantifier('x', syntax.symbols.FORALL),
    syntax.mkquantifier('x', syntax.symbols.EXISTS),
  ])
  const buttons = []

  for (const [, variable] of normalizeIndexedSymbols(text).matchAll(/[∀∃]([s-z](?:_[1-9][0-9]*)?)/g)) {
    for (const quantifier of [syntax.symbols.FORALL, syntax.symbols.EXISTS]) {
      const insert = displayIndexedSymbolsForNotation(
        syntax.mkquantifier(variable, quantifier),
        syntax.notationname
      )
      if (!seen.has(insert)) {
        seen.add(insert)
        buttons.push({ label: insert, insert })
      }
    }
  }

  return buttons
}

// falsum, the fitch index key and quantifiers over any other variables the formulas use
export const getProofSymbolButtons = ({ symbols, syntax, allowIndexedSymbols, premises, conclusion }) => [
  { label: symbols.falsum, insert: symbols.falsum },
  ...(allowIndexedSymbols ? [{ label: 'x₂', insert: '_' }] : []),
  ...getQuantifierButtonsFromFormulas(premises, conclusion, syntax),
]

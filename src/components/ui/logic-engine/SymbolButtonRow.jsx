import getSyntax from '@logic-app/logic-engine/symbolic/libsyntax.js'
import { getNotation } from '../../../lib/logicSystems.js'
import LogicSymbol, { getInsertSymbolLabel } from './LogicSymbol.jsx'
import LogicSymbolKeyRow, { getLogicSymbolKeySx } from './LogicSymbolKeyRow.jsx'

const FALLBACK_SYMBOLS = {
  NOT: '~',
  AND: '\u2022',
  OR: '\u2228',
  IFTHEN: '\u2283',
  IFF: '\u2261',
  FORALL: '\u2200',
  EXISTS: '\u2203',
}

const BUTTONS = [
  { op: 'NOT' },
  { op: 'AND' },
  { op: 'OR' },
  { op: 'IFTHEN' },
  { op: 'IFF' },
  { op: 'FORALL', quantifier: true },
  { op: 'EXISTS', quantifier: true },
  { pair: '()' },
  { pair: '[]' },
  { backspace: true },
]

export const symbolRowButtonSx = getLogicSymbolKeySx()

export default function SymbolButtonRow({
  inputRef,
  disabled = false,
  includeQuantifiers = true,
  // the phone keypad keeps backspace on its nav row
  showBackspace = true,
  extraInsertButtons,
  centerButtons = false,
  logicSystem,
}) {
  const syntax = getSyntax(getNotation(logicSystem))
  const symbols = syntax?.symbols || {}
  const getQuantifierText = (op) => {
    const sym = symbols?.[op] || FALLBACK_SYMBOLS[op] || op
    return syntax?.mkquantifier?.('x', sym) ?? `${sym}x`
  }

  const resolveLabel = ({ op, quantifier = false, insert = null, pair = null, backspace = false, label }) => {
    if (backspace) return '←'
    if (label) return label
    if (insert) return insert
    if (pair) return `${pair[0]}  ${pair[1]}`
    const sym = symbols?.[op] || FALLBACK_SYMBOLS[op] || op
    return quantifier ? getQuantifierText(op) : sym
  }

  // every key edits the formula field through its handle, whose own change event reaches the page
  const handleInsert = ({ op, quantifier = false, insert = null, pair = null, backspace = false }) => {
    const field = inputRef?.current
    if (disabled || !field) return
    if (backspace) field.deleteBackward()
    else if (insert) field.setRangeText(insert)
    else if (quantifier) field.setRangeText(getQuantifierText(op))
    else if (pair) field.insertPair(pair)
    else field.insOp(op)
    field.focus()
  }

  const baseButtonsRaw = includeQuantifiers
    ? BUTTONS
    : BUTTONS.filter((btn) => !btn.quantifier)
  const baseButtons = showBackspace
    ? baseButtonsRaw
    : baseButtonsRaw.filter((btn) => !btn.backspace)
  const visibleButtons = baseButtons.length > 0 && baseButtons[baseButtons.length - 1].backspace
    ? [...baseButtons.slice(0, -1), ...(extraInsertButtons || []), { backspace: true }]
    : [...baseButtons, ...(extraInsertButtons || [])]
  const rowButtons = visibleButtons.map(({ op, quantifier, insert, pair, backspace, label }) => {
    const payload = { op, quantifier, insert, pair, backspace }
    const visualSymbol = resolveLabel({ ...payload, label })
    const ariaLabel = backspace ? 'Backspace' : getInsertSymbolLabel({
      insert: pair ? null : insert || visualSymbol,
      pair,
    })
    return {
      key: backspace ? 'backspace' : (op || insert || pair),
      label: visualSymbol,
      content: <LogicSymbol symbol={visualSymbol} />,
      ariaLabel,
      payload,
    }
  })

  return (
    <LogicSymbolKeyRow
      buttons={rowButtons}
      onSelect={handleInsert}
      disabled={disabled}
      center={centerButtons}
    />
  )
}

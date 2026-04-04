import { applyInsertion, applyLinesToJustification } from './derivationUtils.js'

export function handleDerivationFormulaKeyDown({
  event,
  focusJustification,
  getStoredSelection,
  handleLineChange,
  handleLineCommit,
  index,
  normalizeFormulaForCheck,
  readOnly,
  setStoredSelection,
}) {
  if (readOnly) return
  const input = event.target
  if (!input) return
  if (event.key === 'Enter') {
    event.preventDefault()
    const normalized = normalizeFormulaForCheck(input.value)
    handleLineCommit(index, 'formula', normalized)
    focusJustification(index)
    return
  }
  if (event.key === 'ArrowRight' && !event.ctrlKey && !event.metaKey && !event.altKey) {
    const length = (input.value ?? '').length
    const selectionEnd = typeof input.selectionEnd === 'number' ? input.selectionEnd : getStoredSelection(index, length).end
    if (selectionEnd >= length) {
      event.preventDefault()
      focusJustification(index)
    }
    return
  }

  const key = event.key
  const value = input.value ?? ''
  const stored = getStoredSelection(index, value.length)
  const start = typeof input.selectionStart === 'number' ? input.selectionStart : stored.start
  const end = typeof input.selectionEnd === 'number' ? input.selectionEnd : stored.end
  const hasModifier = event.ctrlKey || event.metaKey || event.altKey

  const insertSymbol = (symbol, replaceBefore = 0) => {
    event.preventDefault()
    const caret = start
    if (typeof input.setRangeText === 'function') {
      const replaceStart = Math.max(0, start - replaceBefore)
      input.setRangeText(symbol, replaceStart, end, 'end')
      const nextValue = input.value ?? ''
      handleLineChange(index, 'formula', nextValue)
      const nextCursor = Math.max(0, caret - replaceBefore) + symbol.length
      setStoredSelection(index, nextCursor)
      setTimeout(() => input.setSelectionRange(nextCursor, nextCursor), 0)
      return
    }
    const { nextValue, nextCursor } = applyInsertion(value, start, end, symbol, replaceBefore)
    handleLineChange(index, 'formula', nextValue)
    setStoredSelection(index, nextCursor)
    setTimeout(() => input.setSelectionRange(nextCursor, nextCursor), 0)
  }

  if (!hasModifier && (key === '&' || key === '^' || key === '.' || key === '*' || key === '•' || key === '·' || key === '∧')) {
    insertSymbol('•')
    return
  }
  if (!hasModifier && (key === 'v' || key === '∨')) {
    insertSymbol('∨')
    return
  }
  if (!hasModifier && (key === '>' || key === '→' || key === '⇒' || key === '⊃')) {
    const hyphenMatch = value.slice(0, start).match(/-+$/)
    insertSymbol('⊃', hyphenMatch ? hyphenMatch[0].length : 0)
    return
  }
  if (!hasModifier && key === '=' && start > 0 && value[start - 1] === '=') {
    insertSymbol('≡', 1)
    return
  }
  if (!hasModifier && (key === 'l' || key === 'L')) {
    const textWithKey = value.slice(0, start) + key.toLowerCase()
    if (/all$/i.test(textWithKey)) {
      insertSymbol('∀', 2)
    }
    return
  }
  if (!hasModifier && (key === 'e' || key === 'E')) {
    const textWithKey = value.slice(0, start) + key.toLowerCase()
    if (/some$/i.test(textWithKey)) {
      insertSymbol('∃', 3)
    }
  }
}

export async function handleDerivationJustificationKeyDown({
  addLine,
  autoCheckEnabled,
  emitState,
  event,
  focusFormula,
  index,
  lines,
  readOnly,
  runAutoCheck,
  setAutoCheckState,
  setLineDrafts,
  setLineGateErrorNotice,
  setLines,
}) {
  if (readOnly) return
  if (event.key === 'ArrowLeft' && !event.ctrlKey && !event.metaKey && !event.altKey) {
    const input = event.target
    const start = typeof input.selectionStart === 'number' ? input.selectionStart : 0
    if (start <= 0) {
      event.preventDefault()
      focusFormula(index)
    }
    return
  }
  if (event.key !== 'Enter') return

  event.preventDefault()
  const formatted = applyLinesToJustification(lines[index]?.justification, event.target.value)
  const nextLines = lines.map((line, lineIndex) =>
    lineIndex === index ? { ...line, justification: formatted } : line
  )
  setLines(nextLines)
  emitState(nextLines)
  setLineDrafts((prev) => {
    if (!(index in prev)) return prev
    const next = { ...prev }
    delete next[index]
    return next
  })
  if (autoCheckEnabled) {
    try {
      const result = await runAutoCheck(nextLines)
      setAutoCheckState(result)
      if (result.perLine[index] !== 'ok') {
        setLineGateErrorNotice(index, 'Re-check current line to move onto the next line.')
        return
      }
    } catch {
      setLineGateErrorNotice(index, 'Re-check current line to move onto the next line.')
      return
    }
  }
  const nextIndex = index + 1
  if (nextIndex >= lines.length) {
    addLine()
    setTimeout(() => focusFormula(nextIndex), 0)
    return
  }
  focusFormula(nextIndex)
}

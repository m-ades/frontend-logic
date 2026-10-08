import { useEffect, useRef, useState } from 'react'
import { getProvidedJustificationPart, isDerivationFieldReadOnly } from './derivationUtils.js'

/*
tracks the active derivation input and its caret so keyboard buttons
and row number clicks land in the field the student was last editing
*/
export default function useDerivationInputTracking({
  initialFocusField,
  initialFocusLineIndex,
  lines,
  premisesCount,
  useRuleDropdown,
  onFieldChange,
}) {
  const formulaRefs = useRef({})
  const justRefs = useRef({})
  const cursorPositionsRef = useRef({})
  const [activeFormulaIndex, setActiveFormulaIndex] = useState(null)
  const activeKeyboardFormulaIndexRef = useRef(null)
  const lastFormulaIndexRef = useRef(null)
  const lastEditableIndexRef = useRef(null)

  // focus the tapped input once the phone fullscreen overlay opens
  useEffect(() => {
    if (initialFocusLineIndex == null || !initialFocusField) return
    const el =
      initialFocusField === 'formula'
        ? formulaRefs.current[initialFocusLineIndex]
        : justRefs.current[initialFocusLineIndex]
    if (el && typeof el.focus === 'function') {
      const t = setTimeout(() => el.focus(), 0)
      return () => clearTimeout(t)
    }
  }, [initialFocusLineIndex, initialFocusField])

  const setStoredSelection = (index, start, end = start) => {
    cursorPositionsRef.current[index] = { start, end }
  }

  const getStoredSelection = (index, fallbackLength) => {
    const stored = cursorPositionsRef.current[index]
    if (stored && typeof stored === 'object' && typeof stored.start === 'number') {
      return {
        start: stored.start,
        end: typeof stored.end === 'number' ? stored.end : stored.start,
      }
    }
    if (typeof stored === 'number') {
      return { start: stored, end: stored }
    }
    return { start: fallbackLength, end: fallbackLength }
  }

  // keeps the caret after the same text once display normalization rewrites a field
  const restoreCaret = (field, index, el, raw, normalized, normalize) => {
    if (normalized === raw || typeof el?.selectionStart !== 'number') return
    const nextCursor = normalize(raw.slice(0, el.selectionStart)).length
    setStoredSelection(index, nextCursor)
    const refs = field === 'formula' ? formulaRefs : justRefs
    window.setTimeout(() => refs.current[index]?.setSelectionRange?.(nextCursor, nextCursor), 0)
  }

  const focusFormula = (index) => {
    const el = formulaRefs.current[index]
    if (el && typeof el.focus === 'function') {
      el.focus()
    }
  }

  const focusJustification = (index) => {
    let targetIndex = index
    while (
      targetIndex < lines.length
      && isDerivationFieldReadOnly(lines[targetIndex], 'justification')
    ) {
      targetIndex += 1
    }
    const el = justRefs.current[targetIndex]
    if (el && typeof el.focus === 'function') {
      el.focus()
    }
  }

  const activateFormula = (index) => {
    setActiveFormulaIndex(index)
    activeKeyboardFormulaIndexRef.current = index
    lastFormulaIndexRef.current = index
    lastEditableIndexRef.current = index
  }

  const activateJustification = (index) => {
    if (isDerivationFieldReadOnly(lines[index], 'justification')) return
    setActiveFormulaIndex(index)
    lastEditableIndexRef.current = index
  }

  const trackFormulaCursor = (index, event) => {
    lastFormulaIndexRef.current = index
    lastEditableIndexRef.current = index
    const target = event?.target
    if (target && typeof target.selectionStart === 'number') {
      const start = target.selectionStart
      const end = typeof target.selectionEnd === 'number' ? target.selectionEnd : start
      setStoredSelection(index, start, end)
    }
  }

  const getCitationTargetIndex = () => (
    activeFormulaIndex
    ?? activeKeyboardFormulaIndexRef.current
    ?? lastFormulaIndexRef.current
    ?? premisesCount
  )

  const resolveEditableIndex = () => {
    if (activeFormulaIndex !== null && !isDerivationFieldReadOnly(lines[activeFormulaIndex], 'formula')) {
      return activeFormulaIndex
    }
    if (lastEditableIndexRef.current !== null
      && !isDerivationFieldReadOnly(lines[lastEditableIndexRef.current], 'formula')) {
      return lastEditableIndexRef.current
    }
    const fallback = lines.findIndex((line) => !isDerivationFieldReadOnly(line, 'formula'))
    return fallback >= 0 ? fallback : null
  }

  const resolveActiveInputTarget = () => {
    if (typeof document !== 'undefined') {
      const activeElement = document.activeElement
      for (const [index, el] of Object.entries(justRefs.current)) {
        if (el && activeElement === el
          && !isDerivationFieldReadOnly(lines[Number(index)], 'justification')) {
          return { field: 'justification', index: Number(index) }
        }
      }
      for (const [index, el] of Object.entries(formulaRefs.current)) {
        if (el && activeElement === el
          && !isDerivationFieldReadOnly(lines[Number(index)], 'formula')) {
          return { field: 'formula', index: Number(index) }
        }
      }
    }
    const fallbackIndex = resolveEditableIndex()
    return fallbackIndex === null || fallbackIndex === -1
      ? null
      : { field: 'formula', index: fallbackIndex }
  }

  const insertSymbol = ({ insert, pair }) => {
    const target = resolveActiveInputTarget()
    if (!target || target.index === -1 || target.index === null) return
    const targetIdx = target.index
    const field = target.field
    const inputEl = field === 'justification' ? justRefs.current[targetIdx] : formulaRefs.current[targetIdx]

    // symbol buttons don't write into split justification fields
    if (field === 'justification' && (useRuleDropdown || getProvidedJustificationPart(lines[targetIdx]))) {
      inputEl?.focus()
      return
    }

    const current = lines[targetIdx]?.[field] || ''
    const stored = getStoredSelection(targetIdx, current.length)
    const activeFacade = field === 'formula' && targetIdx === activeKeyboardFormulaIndexRef.current && inputEl
    const isFocused = typeof document !== 'undefined' && document.activeElement === inputEl
    const useInputSelection = activeFacade || isFocused
    const start = useInputSelection && typeof inputEl?.selectionStart === 'number' ? inputEl.selectionStart : stored.start
    const end = useInputSelection && typeof inputEl?.selectionEnd === 'number' ? inputEl.selectionEnd : stored.end
    const hasSelection = end > start
    const [open, close] = pair ? pair.split('') : []
    const insertText = pair
      ? (hasSelection ? `${open}${current.slice(start, end)}${close}` : `${open}  ${close}`)
      : insert
    if (!insertText) return
    const nextCursor = pair
      ? (hasSelection ? start + insertText.length : start + open.length + 1)
      : start + insertText.length
    if (inputEl && typeof inputEl.setRangeText === 'function') {
      inputEl.setRangeText(insertText, start, end, 'end')
      onFieldChange(targetIdx, field, inputEl.value ?? '')
      inputEl.focus()
      setStoredSelection(targetIdx, nextCursor)
      setTimeout(() => inputEl.setSelectionRange(nextCursor, nextCursor), 0)
      return
    }
    const before = current.slice(0, start)
    const after = current.slice(end)
    onFieldChange(targetIdx, field, `${before}${insertText}${after}`)
    setStoredSelection(targetIdx, nextCursor)
    if (inputEl) {
      inputEl.focus()
      setTimeout(() => inputEl.setSelectionRange(nextCursor, nextCursor), 0)
    }
  }

  // line indexes shift after a delete so stale element and caret entries must go
  const resetInputRefs = () => {
    formulaRefs.current = {}
    justRefs.current = {}
    cursorPositionsRef.current = {}
  }

  const registerFormulaInput = (index) => (element) => {
    if (element) formulaRefs.current[index] = element
  }

  const registerJustificationInput = (index) => (element) => {
    if (element) justRefs.current[index] = element
  }

  return {
    activeFormulaIndex,
    activateFormula,
    activateJustification,
    focusFormula,
    focusJustification,
    getCitationTargetIndex,
    getStoredSelection,
    insertSymbol,
    registerFormulaInput,
    registerJustificationInput,
    resetInputRefs,
    restoreCaret,
    setStoredSelection,
    trackFormulaCursor,
  }
}

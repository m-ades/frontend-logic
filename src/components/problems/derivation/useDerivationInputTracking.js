import { useEffect, useRef, useState } from 'react'
import { getProvidedJustificationPart, isDerivationFieldReadOnly } from './derivationUtils.js'

/*
tracks the active derivation input so keyboard buttons
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
  const formulaRegisters = useRef({})
  const justRefs = useRef({})
  const [activeFormulaIndex, setActiveFormulaIndex] = useState(null)
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

  // keeps the caret after the same text once display normalization rewrites a field
  const restoreCaret = (field, index, el, raw, normalized, normalize) => {
    if (normalized === raw || typeof el?.selectionStart !== 'number') return
    const nextCursor = normalize(raw.slice(0, el.selectionStart)).length
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
    lastFormulaIndexRef.current = index
    lastEditableIndexRef.current = index
  }

  const activateJustification = (index) => {
    if (isDerivationFieldReadOnly(lines[index], 'justification')) return
    setActiveFormulaIndex(index)
    lastEditableIndexRef.current = index
  }

  const getCitationTargetIndex = () => (
    activeFormulaIndex
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
      for (const [index, field] of Object.entries(formulaRefs.current)) {
        if (field?.hasFocus
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

  // formula fields and justification inputs both keep their selection while blurred, so buttons insert there
  const insertSymbol = ({ insert, pair, op }) => {
    const target = resolveActiveInputTarget()
    if (!target) return
    const { field, index } = target
    const inputEl = (field === 'justification' ? justRefs : formulaRefs).current[index]
    if (!inputEl) return

    // symbol buttons don't write into split justification fields
    if (field === 'justification' && (useRuleDropdown || getProvidedJustificationPart(lines[index]))) {
      inputEl.focus()
      return
    }

    // a formula field spaces connectives and wraps selections like its own keypad and reports its own change
    if (field === 'formula') {
      if (pair) inputEl.insertPair(pair)
      else if (op) inputEl.insOp(op)
      else inputEl.setRangeText(insert)
    } else {
      inputEl.setRangeText(insert ?? pair[0], inputEl.selectionStart, inputEl.selectionEnd, 'end')
      onFieldChange(index, field, inputEl.value ?? '')
    }
    inputEl.focus()
  }

  // line indexes shift after a delete so stale entries must go
  const resetInputRefs = () => {
    formulaRefs.current = {}
    justRefs.current = {}
    // fresh callbacks so every field registers again under its new index
    formulaRegisters.current = {}
  }

  // one stable callback per line so formula fields keep their handle across renders
  const registerFormulaInput = (index) => {
    formulaRegisters.current[index] ??= (field) => {
      if (field) formulaRefs.current[index] = field
    }
    return formulaRegisters.current[index]
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
    insertSymbol,
    registerFormulaInput,
    registerJustificationInput,
    resetInputRefs,
    restoreCaret,
  }
}

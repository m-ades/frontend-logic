import { useCallback, useMemo } from 'react'
import { canonicalizeFormula } from '@logic-app/logic-engine/symbolic/formula.js'
import {
  describeProvidedJustification,
  mergeProvidedJustification,
} from '@logic-app/logic-engine/proofArgumentExtractionJustifications.js'
import { displayIndexedSymbolsForNotation } from '../../../lib/indexedSymbols.js'
import { logicStatementsToTex } from '../../../lib/logicTex.js'
import { extractLines } from './derivationUtils.js'

/*
normalizes the proof prompt into display formulas and starting lines
fixed proofs keep what the author provided and take the rest from saved work
*/
export default function useDerivationProof({
  activeLogicSystem,
  fixedLines,
  notation,
  proof,
  savedState,
  syntax,
  usesNestedSubderivations,
}) {
  const normalizeFormulaForCheck = useCallback(
    (value) => canonicalizeFormula(value, notation),
    [notation]
  )
  const normalizeFormulaForDisplay = useCallback(
    (value) => {
      const raw = String(value ?? '')
      if (/[-–]$/.test(raw)) {
        const fixed = syntax.inputfix(raw.slice(0, -1)).replace(/\s+$/g, '') + raw.slice(-1)
        return displayIndexedSymbolsForNotation(fixed, notation)
      }
      return displayIndexedSymbolsForNotation(syntax.inputfix(raw), notation)
    },
    [notation, syntax]
  )
  const normalizeStoredFormula = useCallback(
    (value) => normalizeFormulaForDisplay(normalizeFormulaForCheck(value)),
    [normalizeFormulaForCheck, normalizeFormulaForDisplay]
  )
  const premises = useMemo(
    () => (Array.isArray(proof?.premises) ? proof.premises : []),
    [proof?.premises]
  )
  const normalizedFixedLines = useMemo(() => (
    Array.isArray(fixedLines)
      ? fixedLines.map((line) => ({
          formula: normalizeStoredFormula(line.formula),
          justification: String(line.justification ?? '').trim(),
          scopeDepth: Number.isInteger(line.scopeDepth) ? line.scopeDepth : null,
          startsScope: line.startsScope === true,
          requiredRules: Array.isArray(line.requiredRules) ? line.requiredRules : null,
        }))
      : null
  ), [fixedLines, normalizeStoredFormula])
  const isFixedProof = normalizedFixedLines !== null
  const normalizedConclusion = proof?.conclusion
    ? normalizeStoredFormula(proof.conclusion)
    : ''
  const normalizedPremises = premises.map(normalizeStoredFormula)
  const argumentTarget = !isFixedProof && usesNestedSubderivations && normalizedConclusion
    ? {
        text: `${normalizedPremises.join(', ')}${normalizedPremises.length ? ' ' : ''}∴ ${normalizedConclusion}`,
        tex: logicStatementsToTex([...normalizedPremises, normalizedConclusion], true),
      }
    : null
  const buildFreshLines = useCallback((restoredLines = []) => {
    const premiseLines = premises.map((premise) => ({
      formula: normalizeStoredFormula(premise),
      justification: '',
      readOnly: true,
    }))
    if (normalizedFixedLines) {
      return [
        ...premiseLines,
        ...normalizedFixedLines.map((line, index) => ({
          // a blank formula is the student's to write
          formula: line.formula || normalizeStoredFormula(restoredLines[premises.length + index]?.formula ?? ''),
          justification: mergeProvidedJustification(
            line.justification,
            restoredLines[premises.length + index]?.justification,
            { rulesFirst: usesNestedSubderivations }
          ),
          readOnly: false,
          formulaReadOnly: Boolean(line.formula),
          provided: describeProvidedJustification(line.justification, activeLogicSystem),
          scopeDepth: line.scopeDepth,
          startsScope: line.startsScope,
          requiredRules: line.requiredRules,
        })),
      ]
    }
    return [
      ...premiseLines,
      { formula: '', justification: '', readOnly: false },
    ]
  }, [activeLogicSystem, normalizeStoredFormula, normalizedFixedLines, premises, usesNestedSubderivations])
  const initialLines = useMemo(() => {
    const fromState = extractLines(savedState, premises)
    if (isFixedProof) return buildFreshLines(fromState)
    if (fromState.length) {
      return fromState.map((line) => ({
        ...line,
        formula: normalizeStoredFormula(line.formula),
      }))
    }
    return buildFreshLines()
  }, [buildFreshLines, isFixedProof, normalizeStoredFormula, savedState, premises])

  return {
    argumentTarget,
    buildFreshLines,
    conclusionTargetText: normalizedConclusion ? `// ${normalizedConclusion}` : '',
    initialLines,
    isFixedProof,
    normalizeFormulaForCheck,
    normalizeFormulaForDisplay,
    premises,
  }
}

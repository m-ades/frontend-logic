import { DEFAULT_LOGIC_SYSTEM, isDerivationProblemType } from '../../../lib/logicSystems.js'
import {
  validateArgumentInput,
  validateArgumentLineInput,
  validateFormulaInput,
  validateFormulaInputs,
  validateTranslationAnswerInput,
} from './formulaHelpers.js'

export function validateQuestionSnapshotFormulas(snapshot, logicSystem = DEFAULT_LOGIC_SYSTEM) {
  const type = snapshot?.logic_problem_type || snapshot?.type || snapshot?.problemType
  if (type === 'truth-table') {
    const tt = snapshot.truthTable || snapshot.truth_table || {}
    if (tt.kind === 'equivalence') {
      const statements = Array.isArray(tt.statements)
        ? tt.statements
        : [tt.left, tt.right]
      return validateFormulaInputs(statements, logicSystem, 'Statement')
    }
    if (tt.kind === 'argument') {
      return validateFormulaInputs(tt.lefts, logicSystem, 'Premise')
        || validateFormulaInput(tt.right, logicSystem, 'Conclusion')
    }
    return validateFormulaInput(tt.statement ?? tt.formula, logicSystem, 'Statement')
  }
  if (type === 'indirect-truth-table' || type === 'nonclassical-truth-table') {
    return validateArgumentInput(snapshot.argument, logicSystem)
  }
  if (isDerivationProblemType(type)) {
    return validateFormulaInputs(snapshot.prems ?? snapshot.premises, logicSystem, 'Premise')
      || validateFormulaInput(snapshot.conc ?? snapshot.conclusion, logicSystem, 'Conclusion')
  }
  if (type === 'evaluate-truth') {
    return validateFormulaInput(snapshot.statement ?? snapshot.prompt, logicSystem, 'Statement')
  }
  if (type === 'symbolic-translation') {
    return validateTranslationAnswerInput(snapshot.answer, logicSystem)
  }
  if (type === 'single-row-truth-table' || type === 'partial-truth-table') {
    return validateFormulaInput(snapshot.statement ?? snapshot.formula, logicSystem, 'Statement')
  }
  if (type === 'combo-translation-truth-table' || type === 'combo-translation-derivation') {
    const answer = snapshot.answer
    if (Array.isArray(answer?.premises) || answer?.conclusion !== undefined) {
      return validateArgumentInput(answer, logicSystem, 'Expected argument')
    }
    if (Array.isArray(answer?.translations)) {
      return validateFormulaInputs(answer.translations, logicSystem, 'Expected translation')
    }
    const argument = typeof answer === 'string' ? answer : (answer?.argumentLine ?? answer?.argument)
    return validateArgumentLineInput(argument, logicSystem)
  }
  if (type === 'proof-argument-extraction') {
    return validateFormulaInputs(snapshot.prems, logicSystem, 'Premise')
      || validateFormulaInputs(snapshot.lines, logicSystem, 'Proof line')
  }
  return ''
}

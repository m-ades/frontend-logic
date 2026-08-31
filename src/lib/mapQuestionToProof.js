import {
  DEFAULT_LOGIC_SYSTEM,
  LEGACY_LOGIC_SYSTEM,
  isDerivationProblemType,
  normalizeLogicSystem,
} from './logicSystems.js'

export const normalizeType = (snapshot) => (
  snapshot?.type || snapshot?.problemType || snapshot?.logic_problem_type || 'derivation'
)

export const logicSystemForQuestionType = (type, fallback = DEFAULT_LOGIC_SYSTEM) => {
  if (type === 'derivation-hurley') return LEGACY_LOGIC_SYSTEM
  if (type === 'derivation-calgary') return DEFAULT_LOGIC_SYSTEM
  return normalizeLogicSystem(fallback, DEFAULT_LOGIC_SYSTEM)
}

function normalizeChoiceQuestions(snapshot) {
  const snapshotQuestions = snapshot.questions || snapshot.subquestions || []
  const choiceList = Array.isArray(snapshot.choices) ? snapshot.choices : []
  const questions = Array.isArray(snapshotQuestions) && snapshotQuestions.length > 0
    ? snapshotQuestions
    : (choiceList.length > 0
      ? [{
          prompt: snapshot.choicePrompt || snapshot.question || '',
          choices: choiceList,
          answerIndex: snapshot.answerIndex
            ?? snapshot.answer
            ?? (Array.isArray(snapshot.answerIndices) ? snapshot.answerIndices[0] : undefined),
        }]
      : [])
  const derivedAnswer = questions.length
    ? questions.map((question) => question.answerIndex ?? question.answer ?? question.correctIndex)
    : (snapshot.answerIndex ?? snapshot.answer ?? snapshot.answerIndices)

  return { questions, choiceList, derivedAnswer }
}

export const mapQuestionToProof = (question, assignment, index, logicSystem = DEFAULT_LOGIC_SYSTEM) => {
  const snapshot = question?.question_snapshot || {}
  const type = normalizeType(snapshot)
  const proofLogicSystem = logicSystemForQuestionType(type, logicSystem)
  const description = snapshot.prompt || snapshot.description || snapshot.text || 'Solve.'
  const questionId = question?.id ?? question?.assignment_question_id ?? question?.assignmentQuestionId ?? null
  const orderIndex = question?.order_index ?? question?.orderIndex ?? index
  const proofId = `${assignment.id}-${questionId ?? index}`
  const solution = snapshot.solution
  const attemptLimit = question?.attempt_limit ?? 3
  const legend = snapshot.legend || snapshot.legend_text || snapshot.legendText || ''
  const snapshotPartial =
    snapshot.partialCredit ??
    snapshot.partialcredit ??
    snapshot.partial_credit ??
    snapshot.truthTable?.options?.partialCredit ??
    snapshot.truthTable?.options?.partialcredit ??
    snapshot.truthTable?.options?.partial_credit ??
    snapshot.truth_table?.options?.partialCredit ??
    snapshot.truth_table?.options?.partialcredit ??
    snapshot.truth_table?.options?.partial_credit ??
    snapshot.options?.partialCredit ??
    snapshot.options?.partialcredit ??
    snapshot.options?.partial_credit ??
    false
  const proofBase = {
    id: proofId,
    questionId,
    assignmentId: assignment?.id ?? null,
    description,
    solution,
    attemptLimit,
    legend,
    partialCredit: Boolean(snapshotPartial),
    logicSystem: proofLogicSystem,
    questionSnapshot: question?.question_snapshot ?? snapshot,
    orderIndex,
  }

  if (type === 'proof-argument-extraction') {
    const lines = Array.isArray(snapshot.lines) ? snapshot.lines : []
    return {
      ...proofBase,
      type: 'proof-argument-extraction',
      premises: Array.isArray(snapshot.prems) ? snapshot.prems : [],
      lines,
      conclusion: lines.at(-1) || '',
      ruleset: snapshot.ruleset || {},
      options: snapshot.options || {},
    }
  }

  if (isDerivationProblemType(type)) {
    return {
      ...proofBase,
      type: 'derivation',
      premises: snapshot.prems || snapshot.premises || [],
      conclusion: snapshot.conc || snapshot.conclusion || '',
      ruleset: snapshot.ruleset || snapshot.ruleSet || {},
      options: snapshot.options || {},
    }
  }

  if (type === 'truth-table') {
    const ttOptions = snapshot.options || snapshot.truthTable?.options || snapshot.truth_table?.options || {}
    const ttSnapshot = snapshot.truthTable || snapshot.truth_table || {}
    const ttKind = ttSnapshot.kind || snapshot.truthTable?.kind || snapshot.truth_table?.kind || 'formula'
    const hasClassification = ttOptions.question === true || ttOptions.question === 'true'
    const ttPartialCredit =
      ttOptions.partialCredit ??
      ttOptions.partialcredit ??
      ttOptions.partial_credit ??
      hasClassification ??
      snapshotPartial
    return {
      ...proofBase,
      partialCredit: Boolean(ttPartialCredit || hasClassification),
      type: 'truth-table',
      options: ttOptions,
      truthTable: {
        ...ttSnapshot,
        kind: ttKind,
        statement: ttSnapshot.statement ?? snapshot.statement ?? snapshot.formula ?? '',
        options: ttOptions,
      },
    }
  }

  if (type === 'symbolic-translation') {
    return {
      ...proofBase,
      type: 'symbolic-translation',
      translation: {
        legend: snapshot.legend || '',
        prompt: snapshot.prompt || snapshot.statement || snapshot.question || '',
        sentence: snapshot.sentence || '',
        symbolizationKey: snapshot.symbolizationKey || snapshot.symbolization_key || [],
        options: snapshot.options || {},
      },
      answer: snapshot.answer,
    }
  }

  if (type === 'multiple-choice') {
    const subquestions = snapshot.subquestions || snapshot.questions || []
    const hasSubquestions = Array.isArray(subquestions) && subquestions.length > 0
    const baseMultipleChoice = snapshot.multipleChoice || {
      prompt: snapshot.prompt || '',
      choices: snapshot.choices || [],
    }
    const normalizedMultipleChoice = {
      ...baseMultipleChoice,
      subquestions: baseMultipleChoice.subquestions || subquestions,
    }
    return {
      ...proofBase,
      type: 'multiple-choice',
      multipleChoice: normalizedMultipleChoice,
      answer: hasSubquestions ? null : (snapshot.answerIndices ?? snapshot.answerIndex ?? snapshot.answer),
    }
  }

  if (type === 'indirect-truth-table') {
    const { questions, choiceList, derivedAnswer } = normalizeChoiceQuestions(snapshot)
    return {
      ...proofBase,
      type: 'indirect-truth-table',
      answer: derivedAnswer,
      indirectTruthTable: {
        prompt: snapshot.prompt || '',
        argument: snapshot.argument || {},
        questions,
        subquestions: questions,
        choices: choiceList,
        sandbox: snapshot.sandbox || {},
      },
    }
  }

  if (type === 'nonclassical-truth-table') {
    const { questions, choiceList, derivedAnswer } = normalizeChoiceQuestions(snapshot)
    return {
      ...proofBase,
      type: 'nonclassical-truth-table',
      answer: derivedAnswer,
      nonclassicalTruthTable: {
        prompt: snapshot.prompt || '',
        argument: snapshot.argument || {},
        questions,
        subquestions: questions,
        choices: choiceList,
        truthValueToggle: snapshot.truthValueToggle || snapshot.truth_value_toggle || snapshot.truthValueCycle || snapshot.truth_value_cycle,
        sandbox: snapshot.sandbox || {},
      },
    }
  }

  if (type === 'evaluate-truth') {
    return {
      ...proofBase,
      type: 'evaluate-truth',
      evaluateTruth: snapshot.statement || snapshot.evaluateTruth || snapshot.prompt || '',
      answer: snapshot.answer,
    }
  }

  if (type === 'single-row-truth-table') {
    return {
      ...proofBase,
      type: 'single-row-truth-table',
      singleRowTruthTable: {
        statement: snapshot.statement || snapshot.evaluateTruth || snapshot.prompt || '',
        interpretation: snapshot.interpretation || {},
        row: Array.isArray(snapshot.row) ? snapshot.row : undefined,
        prompt: snapshot.prompt || snapshot.description || '',
      },
    }
  }

  if (type === 'partial-truth-table') {
    return {
      ...proofBase,
      type: 'partial-truth-table',
      partialTruthTable: snapshot,
    }
  }

  if (type === 'combo-translation-truth-table') {
    const comboOptions = snapshot.options || {}
    const comboPartial = comboOptions.partialCredit ?? comboOptions.partialcredit ?? comboOptions.partial_credit ?? snapshotPartial
    return {
      ...proofBase,
      partialCredit: Boolean(comboPartial),
      description: '',
      type: 'combo-translation-truth-table',
      answer: snapshot.answer,
      options: snapshot.options,
      comboTranslationTruthTable: snapshot,
    }
  }

  if (type === 'combo-translation-derivation') {
    const comboOptions = snapshot.options || {}
    const comboPartial = comboOptions.partialCredit ?? comboOptions.partialcredit ?? comboOptions.partial_credit ?? snapshotPartial
    return {
      ...proofBase,
      partialCredit: Boolean(comboPartial),
      description: '',
      type: 'combo-translation-derivation',
      answer: snapshot.answer,
      options: snapshot.options,
      comboTranslationDerivation: snapshot,
    }
  }

  return {
    ...proofBase,
    type,
  }
}

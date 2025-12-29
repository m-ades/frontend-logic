const createProof = (
  worksheetId,
  questionId,
  premises,
  conclusion,
  description = '',
  options = {}
) => {
  const { type, ...rest } = options
  return {
    id: `${worksheetId}-${questionId}`,
    questionId,
    premises,
    conclusion,
    description: 'Solve.',
    type: type || 'derivation',
    ...rest,
  }
}

const WORKSHEET_14 = [
  createProof(14, 'A', ['(x)(Ax ⊃ Bx)', '~Bm'], '(∃x)~Ax'),
  createProof(14, 'B', ['(x)(Ax ⊃ Bx)', '(x)(Cx ⊃ Dx)', 'Ae ∨ Ce'], '(∃x)(Bx ∨ Dx)'),
  createProof(14, 'C', ['(∃x)Ax ⊃ (x)(Bx ⊃ Cx)', 'Am • Bm'], 'Cm'),
  createProof(14, 'D', ['(∃x)Ax ⊃ (x)Bx', '(∃x)Cx ⊃ (∃x)Dx', 'An • Cn'], '(∃x)(Bx • Dx)'),
  createProof(14, 'E', ['(x)(Ax • Bx)', 'Cr ∨ ~(x)Bx'], '(∃x)(Cx • Ax)'),
  createProof(14, 'F', ['(x)[Ax ⊃ (Bx ≡ Cx)]', 'An • Am', 'Cn • ~Cm'], 'Bn • ~Bm'),
]

const WORKSHEET_15 = [
  createProof(1, 1, ['(∀x)(Dx ⊃ Mx)', '(∀x)(Mx ⊃ Dx)'], '(∀x)(Dx ≡ Mx)'),
  createProof(1, 2, ['(∀x)[(Ax • Bx) ⊃ Cx]', '(∀x)(Cx ⊃ Dx)'], '(∀x)[(Ax • Bx) ⊃ Dx]'),
  createProof(1, 3, ['(∀x)[Ax ⊃ (Bx ∨ Cx)]', '(∃x)(Ax•~Cx)'], '(∃x)Bx'),
  createProof(1, 4, ['(∀x)[(Ax • Bx) ⊃ Cx]', '(∀x)(Cx ⊃ Dx)'], '(∀x)[(Ax • Bx) ⊃ Dx]'),
  createProof(1, 5, ['(∀x)[Jx ⊃ (Kx • Lx)]', '(∃y)~Ky'], '(∃z)~Jz'),
  createProof(1, 6, ['(∃x)[(Ax)• (Cx ⊃ Bx)]', 'Cb'], '(∃x)(Ax)• (∃x)(Cx)'),
  createProof(1, 7, ['[(∃x)(Ax)• (∃x)(Bx)] ⊃ Cj', '(∃x)(Ax•Dx)', '(∃x)(Bx•Ex)'], 'Cj'),
  createProof(1, 8, ['(∃x)(Kx) ⊃ (∀x)[Lx ⊃ Mx]', 'Kc • Lc'], 'Mc'),
  createProof(1, 9, ['(∀x)(Px⊃ Qx) ⊃ (∃x)(Sx)', '(∀x)(Px⊃ Sx) • (∀x)(Sx⊃ Qx)'], '(∃x)Sx'),
  createProof(1, 10, ['~(∃x)(Px•~Qx)', '~(∀x)(~Rx ∨ Qx)'], '(∃x)~Px'),
  createProof(1, 11, ['(∃x)(Hx•Gx) ⊃ (∀x) Ax', '~Am'], '(∀x) (Hx ⊃ ~Gx)'),
]

const WORKSHEET_16 = [
  createProof(16, 'J', ['~(∃x)(Px•~Qx)', '~(∀x)(~Rx ∨ Qx)'], '(∃x)~Px'),
  createProof(16, 'K', ['(∃x)(Hx•Gx) ⊃ (∀x) Ax', '~Am'], '(∀x)(Hx ⊃ ~Gx)'),
  createProof(16, 1, ['(x)(Ax ⊃ Bx)', '(x)(Ax ⊃ Cx)'], '(x)[Ax ⊃ (Bx • Cx)]'),
  createProof(16, 2, ['(∃x)Ax ⊃ (∃x)(Bx • Cx)', '(∃x)(Cx ∨ Dx) ⊃ (x)Ex'], '(x)(Ax ⊃ Ex)'),
  createProof(16, 3, ['(∃x)Ax ⊃ (∃x)(Bx • Cx)', '~(∃x)Cx'], '(x)~Ax'),
  createProof(16, 4, ['(x)(Ax ⊃ Cx)', '(∃x)Cx ⊃ (∃x)(Bx • Dx)'], '(∃x)Ax ⊃ (∃x)Bx'),
  createProof(16, 5, ['(x)(Ax ⊃ Bx)', 'Am ∨ An'], '(∃x)Bx'),
  createProof(16, 6, ['(∃x)Ax ⊃ (x)(Bx ⊃ Cx)', '(∃x)Dx ⊃ (∃x)Bx'], '(∃x)(Ax • Dx) ⊃ (∃x)Cx'),
  createProof(16, 7, ['(x)(Ax ⊃ Bx)', '~(∃x)Ax ⊃ (∃x)(Cx • Dx)', '(∃x)(Dx ∨ Ex) ⊃ (∃x)Bx'], '(∃x)Bx'),
  createProof(16, 8, ['(∃x)(Ax ∨ Ex) ⊃ (x)(Bx • ~Cx)', '(∃x)(Bx ∨ Fx) ⊃ (x)(Cx ∨ Dx)'], '(x)(Ax ⊃ Dx)'),
]
//∨•⊃≡∀∃

const PRACTICE_SET = [
  createProof(17, 1, ['(x)(Ax ≡ Bx)', '(x)[Ax ⊃ (Bx ⊃ Cx)]', '(∃x)Ax ∨ (∃x)Bx'], '(∃x)Cx'),
  createProof(17, 2, ['(∃x)(Hx•Gx) ⊃ (∀x) Ax', '~Am'], '(∀x)(Hx ⊃ ~Gx)'),
  createProof(17, 3, ['', ''], ''),
]

const WORKSHEET_18 = [
  createProof(18, 'A', [], '', 'Evaluate (P ⊃ Q) • (~P ∨ Q).', {
    type: 'truth-table',
    truthTable: { kind: 'formula', statement: '(P ⊃ Q) • (~P ∨ Q)' },
  }),
  createProof(18, 'B', [], '', 'Compare p • q with q • p.', {
    type: 'truth-table',
    truthTable: { kind: 'equivalence', left: 'P • Q', right: 'Q • P' },
  }),
  createProof(18, 'C', [], '', 'Switch the operands on disjunctions.', {
    type: 'truth-table',
    truthTable: { kind: 'equivalence', left: 'P ∨ Q', right: 'Q ∨ P' },
  }),
  createProof(18, 'D', [], '', 'Check de Morgan for conjunction.', {
    type: 'truth-table',
    truthTable: { kind: 'equivalence', left: '~(P • Q)', right: '~P ∨ ~Q' },
  }),
  createProof(18, 'E', [], '', 'Check de Morgan for disjunction.', {
    type: 'truth-table',
    truthTable: { kind: 'equivalence', left: '~(P ∨ Q)', right: '~P • ~Q' },
  }),
  createProof(18, 'F', [], '', 'Relate a conditional to its contrapositive.', {
    type: 'truth-table',
    truthTable: { kind: 'equivalence', left: 'P ⊃ Q', right: '~Q ⊃ ~P' },
  }),
  createProof(18, 'G', [], '', 'Add a redundant disjunct.', {
    type: 'truth-table',
    truthTable: { kind: 'equivalence', left: 'P ∨ (Q • ~Q)', right: 'P' },
  }),
  createProof(18, 'H', [], '', 'Distribute p over q.', {
    type: 'truth-table',
    truthTable: { kind: 'equivalence', left: '(P ⊃ Q) • R', right: '(P • R) ⊃ (Q • R)' },
  }),
  createProof(18, 'I', [], '', 'Compare disjunction with its double negation.', {
    type: 'truth-table',
    truthTable: { kind: 'equivalence', left: 'P ∨ Q', right: '~(~P • ~Q)' },
  }),
  createProof(18, 'J', [], '', 'Show implication building a tautology.', {
    type: 'truth-table',
    truthTable: { kind: 'formula', statement: 'P ⊃ (Q ⊃ P)' },
  }),
  createProof(
    18,
    'K',
    [],
    '',
    'Confirm (p • q) ∨ (r • s) equals (p ∨ r) • (q ∨ r) • (p ∨ s) • (q ∨ s).',
    {
      type: 'truth-table',
      truthTable: {
        kind: 'equivalence',
        left: '(P • Q) ∨ (R • S)',
        right: '(P ∨ R) • (Q ∨ R) • (P ∨ S) • (Q ∨ S)',
      },
    }
  ),
]

const WORKSHEET_TRUTH_TABLES = [
  createProof(19, 'A', [], '', 'Evaluate a single formula.', {
    type: 'truth-table',
    truthTable: { kind: 'formula', statement: 'P ⊃ (Q ⊃ P)' },
  }),
  createProof(19, 'B', [], '', 'Check equivalence between two formulas.', {
    type: 'truth-table',
    truthTable: { kind: 'equivalence', left: 'P • Q', right: 'Q • P' },
  }),
  createProof(19, 'C', [], '', 'Test an argument with truth table.', {
    type: 'truth-table',
    truthTable: { kind: 'argument', lefts: ['P ⊃ Q', 'P'], right: 'Q' },
  }),
]

const WORKSHEET_SYMBOLIC_TRANSLATION = [
  createProof(20, 'A', [], '', 'Translate: All dogs are mammals.', {
    type: 'symbolic-translation',
    translation: 'All dogs are mammals.',
    answer: '(x)(Dx ⊃ Mx)',
  }),
  createProof(20, 'B', [], '', 'Translate: Some cats are not friendly.', {
    type: 'symbolic-translation',
    translation: 'Some cats are not friendly.',
    answer: '(∃x)(Cx • ~Fx)',
  }),
  createProof(20, 'C', [], '', 'Translate: If it rains, then the ground is wet.', {
    type: 'symbolic-translation',
    translation: 'If it rains, then the ground is wet.',
    answer: 'R ⊃ W',
  }),
]

const WORKSHEET_MULTIPLE_CHOICE = [
  createProof(21, 'A', [], '', 'What is the main operator in (P • Q) ⊃ R?', {
    type: 'multiple-choice',
    multipleChoice: {
      prompt: 'What is the main operator in (P • Q) ⊃ R?',
      choices: ['•', '⊃', '∨', '≡'],
    },
  }),
  createProof(21, 'B', [], '', 'Which is a tautology?', {
    type: 'multiple-choice',
    multipleChoice: {
      prompt: 'Which of the following is a tautology?',
      choices: ['P • ~P', 'P ∨ ~P', 'P ⊃ Q', 'P • Q'],
    },
  }),
]

const WORKSHEET_TRUE_FALSE = [
  createProof(22, 'A', [], '', 'Is P • Q logically equivalent to Q • P?', {
    type: 'true-false',
    trueFalse: {
      prompt: 'P • Q is logically equivalent to Q • P.',
    },
  }),
  createProof(22, 'B', [], '', 'Is P ⊃ Q equivalent to ~P ∨ Q?', {
    type: 'true-false',
    trueFalse: {
      prompt: 'P ⊃ Q is logically equivalent to ~P ∨ Q.',
    },
  }),
]

const WORKSHEET_EVALUATE_TRUTH = [
  createProof(23, 'A', [], '', 'Evaluate: P • Q when P is true and Q is false.', {
    type: 'evaluate-truth',
    evaluateTruth: 'P • Q',
    interpretation: { P: true, Q: false },
  }),
  createProof(23, 'B', [], '', 'Evaluate: P ⊃ Q when P is false and Q is true.', {
    type: 'evaluate-truth',
    evaluateTruth: 'P ⊃ Q',
    interpretation: { P: false, Q: true },
  }),
]

const WORKSHEET_VALID_CORRECT_SOUND = [
  createProof(25, 'A', ['All humans are mortal.', 'Socrates is human.'], 'Socrates is mortal.', 'Determine validity, correctness, and soundness.', {
    type: 'valid-correct-sound',
  }),
  createProof(25, 'B', ['All birds can fly.', 'Penguins are birds.'], 'Penguins can fly.', 'Determine validity, correctness, and soundness.', {
    type: 'valid-correct-sound',
  }),
]

export const WORKSHEETS = [
  { id: 14, title: 'Worksheet 14', proofs: WORKSHEET_14 },
  { id: 15, title: 'Worksheet 15', proofs: WORKSHEET_15 },
  { id: 16, title: 'Worksheet 16', proofs: WORKSHEET_16 },
  { id: 17, title: 'Practice Set', proofs: PRACTICE_SET },
  { id: 18, title: 'Worksheet 18 (Truth Tables)', proofs: WORKSHEET_18 },
  { id: 19, title: 'Test: Truth Tables', proofs: WORKSHEET_TRUTH_TABLES },
  { id: 20, title: 'Test: Symbolic Translation', proofs: WORKSHEET_SYMBOLIC_TRANSLATION },
  { id: 21, title: 'Test: Multiple Choice', proofs: WORKSHEET_MULTIPLE_CHOICE },
  { id: 22, title: 'Test: True/False', proofs: WORKSHEET_TRUE_FALSE },
  { id: 23, title: 'Test: Evaluate Truth', proofs: WORKSHEET_EVALUATE_TRUTH },
  { id: 25, title: 'Test: Valid/Correct/Sound', proofs: WORKSHEET_VALID_CORRECT_SOUND },
]

export const PROOFS = WORKSHEET_14

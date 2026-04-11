const addDays = (date, days) => {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next.toISOString()
}

const now = new Date()
const SANDBOX_SESSION_START_KEY = 'logicapp_sandbox_started_at_v2'
const ASSIGNMENT_DAY_OFFSETS = [0, 3, 7]
const PRACTICE_DAY_OFFSETS = [3, 10, 17, 24]

const cloneProofs = (proofs = []) => proofs.map((proof) => ({ ...proof }))

const cloneActivitiesWithOffsets = (items = [], offsets = []) => {
  const sessionStart = getSandboxSessionStart()
  return items.map((item, index) => ({
    ...item,
    due_at: addDays(sessionStart, offsets[index] ?? ((index + 1) * 7)),
    proofs: cloneProofs(item.proofs),
  }))
}

const clonePracticesWithoutDueDates = (items = []) => (
  items.map((item) => ({
    ...item,
    due_at: null,
    proofs: cloneProofs(item.proofs),
  }))
)

export const ensureSandboxSessionStart = () => {
  if (typeof window === 'undefined') return now
  try {
    const raw = window.sessionStorage.getItem(SANDBOX_SESSION_START_KEY)
    if (raw) {
      const parsed = new Date(raw)
      if (!Number.isNaN(parsed.getTime())) return parsed
    }
    const created = new Date()
    window.sessionStorage.setItem(SANDBOX_SESSION_START_KEY, created.toISOString())
    return created
  } catch {
    return now
  }
}

export const getSandboxSessionStart = () => ensureSandboxSessionStart()

export const SANDBOX_USER = {
  id: 'sandbox-student',
  username: 'Demo Student',
  role: 'student',
}

export const SANDBOX_COURSE = {
  id: 'sandbox-course-1',
  name: 'Intro Logic Sandbox',
  code: 'LOGIC-DEMO',
  semester: 'Demo Session',
  status: 'current',
  createdAt: addDays(now, -14),
  studentCount: 1,
  color: '#536DFE',
  latePolicy: {
    enabled: true,
    maxDaysLate: 7,
    penalty: 20,
  },
  gradingScale: [
    { letter: 'A', minPercent: 90, maxPercent: 100, color: '#10b981' },
    { letter: 'B', minPercent: 80, maxPercent: 89, color: '#6366f1' },
    { letter: 'C', minPercent: 70, maxPercent: 79, color: '#f59e0b' },
    { letter: 'D', minPercent: 60, maxPercent: 69, color: '#f97316' },
    { letter: 'F', minPercent: 0, maxPercent: 59, color: '#ef4444' },
  ],
}

export const SANDBOX_DASHBOARD_SERIES = [
  { name: 'Wk 1', score: 72, avg: 69 },
  { name: 'Wk 2', score: 78, avg: 71 },
  { name: 'Wk 3', score: 84, avg: 74 },
  { name: 'Wk 4', score: 88, avg: 76 },
]

export const SANDBOX_RECENT_ACTIVITY = [
  { id: 'activity-1', title: 'Completed a symbolic translation question', detail: 'Foundations Check-In', when: 'Today' },
  { id: 'activity-2', title: 'Unlocked derivation practice', detail: 'Translation to Proof', when: 'Yesterday' },
  { id: 'activity-3', title: 'Viewed updated grades summary', detail: 'Mixed Review', when: '2 days ago' },
]

export const SANDBOX_ASSIGNMENTS = [
  {
    id: 'sandbox-assignment-1',
    course_id: SANDBOX_COURSE.id,
    title: 'Assignment 1',
    description: 'Basic Concepts and Symbolization in Propositional Logic',
    chapter: 1,
    subchapter: '1.1',
    due_at: addDays(now, 3),
    kind: 'homework',
    is_locked: false,
    total_points: 300,
    proofs: [
      {
        id: 'sandbox-q-1',
        questionId: 'sandbox-q-1',
        type: 'multiple-choice',
        attemptLimit: 3,
        multipleChoice: {
          prompt: "<div class=instructions>In this problem, we will check our understanding of the following key concepts.</div><div style='background-color: #f9f9f9; border: 2px solid #2196F3; padding: 15px; border-radius: 4px; margin-top: 20px; color: #333;'>A <strong>valid</strong> argument is an argument in which it is impossible for the conclusion to be false, given that the premises are true.<br><br>A <strong>sound</strong> argument is a <strong>valid</strong> argument that has true premises.<br><br>Validity is often misunderstood because it is defined in terms of possibility, not actual truth. An argument is not <strong>valid</strong> simply because its premises and conclusion are true; even arguments with false premises and false conclusions can be <strong>valid</strong>. What matters is this: in a <strong>valid</strong> deductive argument, it is impossible for the premises to be true and the conclusion to be false at the same time. If you find an argument with true premises and a false conclusion, then the argument is invalid.</div><div>Use your knowledge of the definitions of validity and soundness to determine which of the following statements are true. Select all that apply.</div>",
          subquestions: [
            {
              prompt: 'Select all that apply.',
              choices: [
                'If every statement in an argument is true, then the argument must be valid.',
                'If the premises of an argument make the conclusion likely to be true, then the argument is valid.',
                'A sound argument cannot have any false premises.',
                'An argument with some false premises and a false conclusion can still be valid.',
                'If an argument is valid, then its premises must be true in actuality.',
                'The first step in testing an argument for validity is determining whether the premises are actually true.',
                'It is proper to describe an argument itself as true or false.',
              ],
              multiSelect: true,
              answerIndices: [2, 3],
            },
          ],
        },
      },
      {
        id: 'sandbox-q-2',
        questionId: 'sandbox-q-2',
        type: 'multiple-choice',
        attemptLimit: 3,
        multipleChoice: {
          prompt: "<div class=instructions>In this problem, we will check our understanding of the following key concepts.</div><div style='background-color: #f9f9f9; border: 2px solid #2196F3; padding: 15px; border-radius: 4px; margin-top: 20px; color: #333;'>A <strong>valid</strong> argument is an argument in which it is impossible for the conclusion to be false, given that the premises are true.<br><br>A <strong>sound</strong> argument is a <strong>valid</strong> argument that has true premises.<br><br>Validity is often misunderstood because it is defined in terms of possibility, not actual truth. An argument is not <strong>valid</strong> simply because its premises and conclusion are true; even arguments with false premises and false conclusions can be <strong>valid</strong>. What matters is this: in a <strong>valid</strong> deductive argument, it is impossible for the premises to be true and the conclusion to be false at the same time. If you find an argument with true premises and a false conclusion, then the argument is invalid.</div><div>Select the correct evaluations of the following argument. (Select all that apply.)</div><div>Shakespeare was French, and Shakespeare was a writer. Therefore, Shakespeare is a French writer.</div>",
          subquestions: [
            {
              prompt: 'Select all the correct evaluations.',
              choices: [
                'Shakespeare was neither French nor a writer. Therefore, the above argument is invalid.',
                'Since the conclusion is false, the argument is invalid.',
                'The argument is valid because if both premises were true, the conclusion would have been true.',
                'The argument is not sound because it is not valid.',
                'The argument is not sound because the premises are not true.',
              ],
              multiSelect: true,
              answerIndices: [2, 4],
            },
          ],
        },
      },
      {
        id: 'sandbox-q-3',
        questionId: 'sandbox-q-3',
        type: 'symbolic-translation',
        attemptLimit: 3,
        answer: 'M⊃D',
        translation: {
          prompt: '<div class=instructions>Symbolize the following English-language sentence into a well-formed formula with the symbolization key provided. <br> <strong> Note: </strong> Each well-formed formula is case-sensitive, so be sure to use the exact capitalization of the symbol to receive proper credit.</div><div>Michelle goes to the concert only if Daniel plays piano at the concert.</div>',
          symbolizationKey: [
            'M = Michelle goes to the concert',
            'D = Daniel plays the piano at the concert',
          ],
          options: { pred: false, hints: true, notation: 'cambridge' },
        },
      },
    ],
  },
  {
    id: 'sandbox-assignment-2',
    course_id: SANDBOX_COURSE.id,
    title: 'Assignment 2',
    description: 'Truth Table and Natural Deduction in Propositional Logic',
    chapter: 1,
    subchapter: '1.2',
    due_at: addDays(now, 6),
    kind: 'homework',
    is_locked: false,
    total_points: 500,
    proofs: [
      {
        id: 'sandbox-q-4',
        questionId: 'sandbox-q-4',
        type: 'single-row-truth-table',
        attemptLimit: 3,
        description: '<div class=instructions>Complete a line of the truth table for the following compound statement, given the truth value assignment to its component statements. And, determine whether the compound statement is true or false.</div> <div>Values for G, H, and I are true. <br> Values for M, N, and O are false.</div>',
        singleRowTruthTable: {
          prompt: '<div class=instructions>Complete a line of the truth table for the following compound statement, given the truth value assignment to its component statements. And, determine whether the compound statement is true or false.</div> <div>Values for G, H, and I are true. <br> Values for M, N, and O are false.</div>',
          statement: '~(G • ~O)',
          interpretation: { G: true, O: false },
        },
      },
      {
        id: 'sandbox-q-5',
        questionId: 'sandbox-q-5',
        type: 'truth-table',
        attemptLimit: 3,
        description: 'Complete the truth table for the given argument below to determine whether it is valid or not.',
        truthTable: {
          kind: 'argument',
          lefts: ['P ≡ ~Q', '~(Q • ~P)'],
          right: 'P ⊃ Q',
          options: { question: true, partialcredit: true },
        },
        partialCredit: true,
      },
      {
        id: 'sandbox-q-6',
        questionId: 'sandbox-q-6',
        type: 'combo-translation-truth-table',
        attemptLimit: 3,
        answer: {
          argument: '~E ∨ ~L //~(E ∨ L)',
        },
        comboTranslationTruthTable: {
          prompt: 'Symbolize the given argument in propositional logic and complete the truth table for it to determine whether it is valid or not.\n\nNote: The argument should be entered as a single line. Use "/" to denote separate premises, and "//" to denote the conclusion. For example, "A ⊃ B / A // B".\n\n"Either the Eiffel Tower or the Statue of Liberty was not completed in the 19th century. Therefore, it is not the case that either the Eiffel Tower or the Statue of Liberty was completed in the 19th century."\n\nE = The Eiffel Tower was completed in the 19th century\nL = The Statue of Liberty was completed in the 19th century',
          options: { partialcredit: true },
        },
        partialCredit: true,
      },
      {
        id: 'sandbox-q-9',
        questionId: 'sandbox-q-9',
        type: 'derivation',
        attemptLimit: 3,
        description: '<div class=instruction>Prove the conclusion of the following argument using only one of the four rules introduced in Chapter 7.1, and apply it just once.</div>',
        premises: ['~B ∨ [(H ⊃ M) • (S ⊃ T)]', '~~B'],
        conclusion: '(H ⊃ M) • (S ⊃ T)',
        ruleset: { allow: ['Pr', 'MP', 'MT', 'DS', 'HS'] },
      },
      {
        id: 'sandbox-q-10',
        questionId: 'sandbox-q-10',
        type: 'derivation',
        attemptLimit: 3,
        description: '<div class=instruction>Derive the conclusion from the premises of each argument using conditional proof (CP) and the eighteen rules of inference and replacement.</div> <div> <strong> Note: </strong> To get the full mark, you must use at least one conditional proof in your derivation in this problem set.</div>',
        premises: ['A ⊃ B', '(A • B) ⊃ C'],
        conclusion: 'A ⊃ C',
        ruleset: { allow: ['Pr', 'MP', 'MT', 'DS', 'HS', 'Simp', 'Add', 'Conj', 'CD', 'DM', 'Dist', 'Assoc', 'Com', 'DN', 'Trans', 'Impl', 'Equiv', 'Exp', 'Taut', 'CP', 'ACP'], requireAny: ['CP'] },
      },
    ],
  },
  {
    id: 'sandbox-assignment-3',
    course_id: SANDBOX_COURSE.id,
    title: 'Assignment 3',
    description: 'Concepts, Symbolization and Natural Deduction in Predicate Logic',
    chapter: 2,
    subchapter: '2.1',
    due_at: addDays(now, 10),
    kind: 'homework',
    is_locked: false,
    total_points: 400,
    proofs: [
      {
        id: 'sandbox-q-7',
        questionId: 'sandbox-q-7',
        type: 'multiple-choice',
        attemptLimit: 3,
        multipleChoice: {
          prompt: 'Indicate whether each statement is True (T) or False (F).',
          subquestions: [
            {
              prompt: "If you are using a conditional proof sequence to prove a conditional whose consequent is also a conditional, then you can use another conditional proof sequence, within the scope of the original sequence, to obtain the conditional's consequent.",
              choices: ['True', 'False'],
              answerIndex: 0,
            },
          ],
        },
      },
      {
        id: 'sandbox-q-8',
        questionId: 'sandbox-q-8',
        type: 'multiple-choice',
        attemptLimit: 3,
        multipleChoice: {
          prompt: 'Indicate whether each statement is True (T) or False (F).',
          subquestions: [
            {
              prompt: 'An indented indirect proof sequence must begin with an explicit contradiction having the form p • ~p.',
              choices: ['True', 'False'],
              answerIndex: 1,
            },
          ],
        },
      },
      {
        id: 'sandbox-q-11',
        questionId: 'sandbox-q-11',
        type: 'symbolic-translation',
        attemptLimit: 3,
        answer: '(∀x)((Cx ∨ Bx) ⊃ (Dx • Px)) ⊃ (∃x)(Fx • ~(Sx ∨ Ix))',
        translation: {
          prompt: '<div class=instructions>Symbolize the following statement into predicate logic. </div>\n<p> <strong>Note:</strong> When symbolizing the English statement, avoid using the negation sign (~) before quantifiers.</p>\n\n<br>\n<div style="border: 1px #f9f9f9; padding: 10px; width: 600px; text-align: center;background-color: #F6F4FF; border-radius: 5px;">\n\nEven if all the chefs and bakers are diligent and precise, some foodies will be neither satisfied nor impressed.</div>',
          symbolizationKey: [
            'Cx: x is a chef',
            'Bx: x is a baker',
            'Dx: x is diligent',
            'Px: x is precise',
            'Fx: x is a foodie',
            'Sx: x is satisfied',
            'Ix: x is impressed',
          ],
          options: { pred: true, hints: true, notation: 'cambridge' },
        },
      },
      {
        id: 'sandbox-q-12',
        questionId: 'sandbox-q-12',
        type: 'derivation',
        attemptLimit: 3,
        description: '<div class=instruction>Derive the conclusion from the premises of each argument using the 18 rules of inference and replace and five new rules: UI (Universal Instantiation), UG (Universal Generalization), EI (Existential Instantiation), EG (Existential Generalization), and QN (Quantifier Negation).</div> <div> <strong> Note: </strong> Do not use conditional or indirect proof.',
        premises: ['(∀x)(Fx ⊃ Gx)', '~(∀x)Hx ∨ (∀x)Fx', '~(∀x)Gx'],
        conclusion: '(∃x)~Hx',
        ruleset: { deny: ['CP', 'IP'], allow: ['Pr', 'MP', 'MT', 'DS', 'HS', 'Simp', 'Add', 'Conj', 'CD', 'DM', 'Dist', 'Assoc', 'Com', 'DN', 'Trans', 'Impl', 'Equiv', 'Exp', 'Taut', 'UI', 'UG', 'EI', 'EG', 'QN'] },
      },
    ],
  },
]

export const getSandboxAssignments = () => (
  cloneActivitiesWithOffsets(SANDBOX_ASSIGNMENTS, ASSIGNMENT_DAY_OFFSETS)
)

export const SANDBOX_PRACTICES = [
  {
    id: 'sandbox-practice-1',
    course_id: SANDBOX_COURSE.id,
    title: 'Conceptual Understanding',
    description: '',
    chapter: 1,
    subchapter: '1.1',
    due_at: addDays(now, 2),
    kind: 'practice',
    is_locked: false,
    total_points: 500,
    proofs: [
      {
        id: 'sandbox-practice-1-q-1',
        questionId: 'sandbox-practice-1-q-1',
        type: 'multiple-choice',
        attemptLimit: 3,
        multipleChoice: {
          prompt: "<div class=instructions>Identify the premises and the conclusion of each argument below.</div><div><strong>Note:</strong> The premises and conclusion of an argument in English may not be presented as declarative sentences. However, when you extract the premises and the conclusion, they must be written as complete declarative sentences. Also note that indicator words such as because, since, and therefore are not part of a premise or conclusion.</div><div>The search was conducted without a warrant, and no exigent circumstances were present. The Fourth Amendment prohibits unreasonable searches under such conditions. Consequently, the evidence obtained during the search must be suppressed.</div>",
          subquestions: [
            {
              prompt: 'Select all premises.',
              choices: [
                '1. The search was conducted without a warrant.',
                '2. The evidence obtained during the search must be suppressed.',
                '3. No exigent circumstances were present.',
                '4. The Fourth Amendment prohibits unreasonable searches under such conditions.',
              ],
              multiSelect: true,
              answerIndices: [0, 2, 3],
            },
            {
              prompt: 'Select the conclusion.',
              choices: [
                '1. The search was conducted without a warrant.',
                '2. The evidence obtained during the search must be suppressed.',
                '3. No exigent circumstances were present.',
                '4. The Fourth Amendment prohibits unreasonable searches under such conditions.',
              ],
              answerIndex: 1,
            },
          ],
        },
      },
      {
        id: 'sandbox-practice-1-q-2',
        questionId: 'sandbox-practice-1-q-2',
        type: 'multiple-choice',
        attemptLimit: 3,
        multipleChoice: {
          prompt: 'Indicate whether each statement is True (T) or False (F).',
          subquestions: [
            {
              prompt: 'The last indented line of a conditional proof sequence should always be the antecedent of the conditional you are trying to prove.',
              choices: ['True', 'False'],
              answerIndex: 1,
            },
          ],
        },
      },
      {
        id: 'sandbox-practice-1-q-3',
        questionId: 'sandbox-practice-1-q-3',
        type: 'multiple-choice',
        attemptLimit: 3,
        multipleChoice: {
          prompt: "<div class=instructions>In this problem, we will check our understanding of the following key concepts.</div><div style='background-color: #f9f9f9; border: 2px solid #2196F3; padding: 15px; border-radius: 4px; margin-top: 20px; color: #333;'>A <strong>statement</strong> is a declarative sentence that can be either true or false.<br><br>The truth or falsity of a <strong>statement</strong> is called its <strong>truth value</strong>.</div><div>Consider the following sentences. Select all that are statements. (Select all that apply.)</div>",
          subquestions: [
            {
              prompt: 'Select all that are statements.',
              choices: [
                'Marsupials are neither reptiles nor amphibians.',
                "I promised my sister I'd pick her up today.",
                'Sit down and eat your green salad!',
                'Sunsets are spectacular sights.',
                'Murder is wrong.',
                'Are poodles dogs?',
                'Excuse me?',
                'Awesome!',
                "Don't worry.",
                'The present king of France is bald.',
              ],
              multiSelect: true,
              answerIndices: [0, 1, 3, 4, 9],
            },
          ],
        },
      },
      {
        id: 'sandbox-practice-1-q-4',
        questionId: 'sandbox-practice-1-q-4',
        type: 'multiple-choice',
        attemptLimit: 3,
        multipleChoice: {
          prompt: '<div class=instructions>Use your knowledge of <strong>truth tables</strong>, <strong>classifying statements</strong>, and <strong>comparing statements</strong> to determine which of the following statements are correct. Select all that apply.</div>',
          subquestions: [
            {
              prompt: 'Select all that are true.',
              choices: [
                'Every self-contradictory statement is false.',
                'The conjunction of a contradiction and a tautology is a contingent statement.',
                'In a truth table for a contradiction, the main column contains at least one T and at least one F.',
                'In a truth table for a contingent statement, the main column contains at least one T and at least one F.',
              ],
              multiSelect: true,
              answerIndices: [0, 3],
            },
          ],
        },
      },
      {
        id: 'sandbox-practice-1-q-5',
        questionId: 'sandbox-practice-1-q-5',
        type: 'multiple-choice',
        attemptLimit: 3,
        multipleChoice: {
          prompt: '<div class=instructions>Use your knowledge of the definitions of <strong>argument</strong>, <strong>statement</strong>, <strong>truth values</strong>, <strong>validity</strong>, and <strong>soundness</strong> to determine which of the following statements are true. <em>Check all that apply.</em></div>',
          subquestions: [
            {
              prompt: 'Select all that are true.',
              choices: [
                'A sound deductive argument cannot have any false premises.',
                'If an argument has false premises and a false conclusion, then the argument could be valid.',
                'Any argument with true premises must be a good argument.',
                'It is proper to call an argument either true or false.',
              ],
              multiSelect: true,
              answerIndices: [0, 1],
            },
          ],
        },
      },
    ],
  },
  {
    id: 'sandbox-practice-2',
    course_id: SANDBOX_COURSE.id,
    title: 'Symbolic Translations',
    description: '',
    chapter: 1,
    subchapter: '1.2',
    due_at: addDays(now, 4),
    kind: 'practice',
    is_locked: false,
    total_points: 500,
    proofs: [
      {
        id: 'sandbox-practice-2-q-1',
        questionId: 'sandbox-practice-2-q-1',
        type: 'symbolic-translation',
        attemptLimit: 3,
        answer: 'P⊃C',
        translation: {
          prompt: '<div class=instructions>Symbolize the following English-language sentence into a well-formed formula with the symbolization key provided. <br> <strong> Note: </strong> Each well-formed formula is case-sensitive, so be sure to use the exact capitalization of the symbol to receive proper credit.</div><div> Being elected President of the United States is a sufficient condition for being the Commander-in-Chief.</div>',
          symbolizationKey: [
            'P = Being elected President of the United States',
            'C = Being the Commander-in-Chief',
          ],
          options: { pred: false, hints: true, notation: 'cambridge' },
        },
      },
      {
        id: 'sandbox-practice-2-q-2',
        questionId: 'sandbox-practice-2-q-2',
        type: 'symbolic-translation',
        attemptLimit: 3,
        answer: '(T•B)∨(~C•~M)',
        translation: {
          prompt: '<div class=instructions>Symbolize the following English-language sentence into a well-formed formula with the symbolization key provided. <br> <strong> Note: </strong> Each well-formed formula is case-sensitive, so be sure to use the exact capitalization of the symbol to receive proper credit.</div><div>Taylor Swift and Bad Bunny will release new music unless Cardi B and Marc Anthony do not.</div>',
          symbolizationKey: [
            'T = Taylor Swift will release new music',
            'B = Bad Bunny will release new music',
            'C = Cardi B will release new music',
            'M = Marc Anthony will release new music',
          ],
          options: { pred: false, hints: true, notation: 'cambridge' },
        },
      },
      {
        id: 'sandbox-practice-2-q-3',
        questionId: 'sandbox-practice-2-q-3',
        type: 'symbolic-translation',
        attemptLimit: 3,
        answer: '(∀x)~Ux',
        translation: {
          prompt: '<div class=instructions>Symbolize the following statements into predicate logic. <strong> Note: </strong> The upper-case letters are predicates, and the lower-case letters are individual constants for proper nouns in English. <strong>Avoid</strong> using the negation sign (~) before quantifiers.</div><div>Unicorns do not exist.</div>',
          symbolizationKey: ['U: is a unicorn'],
          options: { pred: true, hints: true, notation: 'cambridge' },
        },
      },
      {
        id: 'sandbox-practice-2-q-4',
        questionId: 'sandbox-practice-2-q-4',
        type: 'symbolic-translation',
        attemptLimit: 3,
        answer: '(∃x)(Rx • ~Vx)',
        translation: {
          prompt: '<div class=instructions>Symbolize the following statement into predicate logic. </div>\n<p> <strong>Note:</strong> When symbolizing the English statement, avoid using the negation sign (~) before quantifiers.</p>\n\n<br>\n<div style="border: 1px #f9f9f9; padding: 10px; width: 500px; text-align: center;background-color: #F6F4FF; border-radius: 5px;">\nNot all reptiles are venomous.</div>',
          symbolizationKey: ['Rx: x is a reptile', 'Vx: x is venomous'],
          options: { pred: true, hints: true, notation: 'cambridge' },
        },
      },
      {
        id: 'sandbox-practice-2-q-5',
        questionId: 'sandbox-practice-2-q-5',
        type: 'symbolic-translation',
        attemptLimit: 3,
        answer: '(∀x)(Cdx ⊃ Pdx)',
        translation: {
          prompt: '<div class=instructions>Symbolize the following statements into predicate logic using relational predicates. <strong> Note: </strong> The upper-case letters are predicates, and the lower-case letters are individual constants for proper nouns in English. </div><div>Disney protects everything it creates.</div>',
          symbolizationKey: ['d: Disney', 'Pxy: x protects y', 'Cxy: x creates y'],
          options: { pred: true, hints: true, notation: 'cambridge' },
        },
      },
    ],
  },
  {
    id: 'sandbox-practice-3',
    course_id: SANDBOX_COURSE.id,
    title: 'Natural Deductions',
    description: '',
    chapter: 2,
    subchapter: '2.1',
    due_at: addDays(now, 6),
    kind: 'practice',
    is_locked: false,
    total_points: 500,
    proofs: [
      {
        id: 'sandbox-practice-3-q-1',
        questionId: 'sandbox-practice-3-q-1',
        type: 'derivation',
        attemptLimit: 3,
        description: "<div class=instruction>Derive the conclusion from the premises of each argument only by using the first four inference rules that we have learned so far: Modus Ponens (MP), Modus Tollens (MT), Disjunctive Syllogism (DS), and Hypothetical Syllogism (HS).</div> <div> <strong> Note: </strong> You don't have to use all the premises to derive the conclusion of the argument.</div>",
        premises: ['A', 'A ⊃ B'],
        conclusion: 'B',
        ruleset: { allow: ['Pr', 'MP', 'MT', 'DS', 'HS'] },
      },
      {
        id: 'sandbox-practice-3-q-2',
        questionId: 'sandbox-practice-3-q-2',
        type: 'derivation',
        attemptLimit: 3,
        description: '<div class=instruction>Prove each of the following tautologies (logical truths) using either indirect proof (IP) or conditional proof (CP) or both; and the eighteen rules of inference and replacement.</div> <div> <strong> Note: </strong> It is necessary to use at least one indirect or conditional proof in your derivation in this problem set.</div>',
        premises: [],
        conclusion: 'A ≡ [A ∨ (B • A)]',
        ruleset: { allow: ['Pr', 'MP', 'MT', 'DS', 'HS', 'Simp', 'Add', 'Conj', 'CD', 'DM', 'Dist', 'Assoc', 'Com', 'DN', 'Trans', 'Impl', 'Equiv', 'Exp', 'Taut', 'CP', 'IP', 'ACP', 'AIP'], requireAny: ['CP', 'IP'] },
      },
      {
        id: 'sandbox-practice-3-q-3',
        questionId: 'sandbox-practice-3-q-3',
        type: 'derivation',
        attemptLimit: 3,
        description: '<div class=instruction>Derive the conclusion from the premises of each argument using the 18 rules of inference and replace and four new rules: UI (Universal Instantiation), UG (Universal Generalization), EI (Existential Instantiation), and EG (Existential Generalization).</div>',
        premises: ['(∀x)[(Fx ∨ Gx) ⊃ Hx]', '(∃y)(Fy • Iy)'],
        conclusion: '(∃y)Hy',
        ruleset: { deny: ['CP', 'IP'], allow: ['Pr', 'MP', 'MT', 'DS', 'HS', 'Simp', 'Add', 'Conj', 'CD', 'DM', 'Dist', 'Assoc', 'Com', 'DN', 'Trans', 'Impl', 'Equiv', 'Exp', 'Taut', 'UI', 'UG', 'EI', 'EG'] },
      },
      {
        id: 'sandbox-practice-3-q-4',
        questionId: 'sandbox-practice-3-q-4',
        type: 'derivation',
        attemptLimit: 3,
        description: '<div class=instruction>Use indirect or conditional proof to derive the conclusion from the premises of each argument. You may use the 18 rules of inference and replacement and five new rules: UI (Universal Instantiation), UG (Universal Generalization), EI (Existential Instantiation), EG (Existential Generalization), and QN (Quantifier Negation).</div>',
        premises: ['(∃x)Fx ⊃ (∃x)(Gx • Hx)', '(∃x)Hx ⊃ (∀x)(Ix • Ix)'],
        conclusion: '(∀x)(Fx ⊃ Ix)',
        ruleset: { allow: ['Pr', 'MP', 'MT', 'DS', 'HS', 'Simp', 'Add', 'Conj', 'CD', 'DM', 'Dist', 'Assoc', 'Com', 'DN', 'Trans', 'Impl', 'Equiv', 'Exp', 'Taut', 'UI', 'UG', 'EI', 'EG', 'QN', 'CP', 'IP', 'ACP', 'AIP'], requireAny: ['CP', 'IP'] },
      },
      {
        id: 'sandbox-practice-3-q-5',
        questionId: 'sandbox-practice-3-q-5',
        type: 'derivation',
        attemptLimit: 3,
        description: '<div class=instruction>Derive the conclusion from the premises of each argument. You may use all 18 rules of inference and replacement and all other quantifier rules (UI, UG, EI, EG, QN). </div>',
        premises: ['(∀x)(∃y)(Ax ⊃ By)'],
        conclusion: '(∀x)Ax ⊃ (∃y)By',
        ruleset: { allow: ['Pr', 'MP', 'MT', 'DS', 'HS', 'Simp', 'Add', 'Conj', 'CD', 'DM', 'Dist', 'Assoc', 'Com', 'DN', 'Trans', 'Impl', 'Equiv', 'Exp', 'Taut', 'UI', 'UG', 'EI', 'EG', 'QN', 'CP', 'IP', 'ACP', 'AIP'] },
      },
    ],
  },
  {
    id: 'sandbox-practice-4',
    course_id: SANDBOX_COURSE.id,
    title: 'Truth Tables',
    description: '',
    chapter: 2,
    subchapter: '2.2',
    due_at: addDays(now, 8),
    kind: 'practice',
    is_locked: false,
    total_points: 500,
    proofs: [
      {
        id: 'sandbox-practice-4-q-1',
        questionId: 'sandbox-practice-4-q-1',
        type: 'single-row-truth-table',
        attemptLimit: 3,
        description: '<div class=instructions>Complete a line of the truth table for the following compound statement, given the truth value assignment to its component statements. And, determine whether the compound statement is true or false.</div> <div>Values for G, H, and I are true. <br> Values for M, N, and O are false.</div>',
        singleRowTruthTable: {
          prompt: '<div class=instructions>Complete a line of the truth table for the following compound statement, given the truth value assignment to its component statements. And, determine whether the compound statement is true or false.</div> <div>Values for G, H, and I are true. <br> Values for M, N, and O are false.</div>',
          statement: 'H ≡ N',
          interpretation: { H: true, N: false },
        },
      },
      {
        id: 'sandbox-practice-4-q-2',
        questionId: 'sandbox-practice-4-q-2',
        type: 'truth-table',
        attemptLimit: 3,
        description: '<div class=instructions>Complete the truth table for the following statement, and determine whether it is tautologous, self-contradictory, or contingent.</div> <div> You can click the squares to fill in the truth value for a cell once for <strong>True</strong> and twice for <strong>False</strong>. Make sure the <strong>entire</strong> table is filled in before you submit your answer.</div>',
        partialCredit: true,
        truthTable: {
          kind: 'formula',
          statement: '[(G ⊃ H) ⊃ H] ⊃ G',
          options: { question: true, partialcredit: true },
        },
      },
      {
        id: 'sandbox-practice-4-q-3',
        questionId: 'sandbox-practice-4-q-3',
        type: 'truth-table',
        attemptLimit: 3,
        description: "<div class=instructions>Consider Sookyeong's beliefs about justice below. To evaluate them logically, we can symbolize them in propositional logic and construct a truth table.</div> <div> \"Justice prevails if either laws are fair or society is compassionate. However, if justice prevails, then laws are not fair.\"</div> <div> J = Justice prevails. <br> S = Society is compassionate. <br> L = Laws are fair. </div>",
        partialCredit: true,
        truthTable: {
          kind: 'equivalence',
          left: '(L ∨ S) ⊃ J',
          right: 'J ⊃ ~L',
          options: { question: true, partialcredit: true },
        },
      },
      {
        id: 'sandbox-practice-4-q-4',
        questionId: 'sandbox-practice-4-q-4',
        type: 'indirect-truth-table',
        attemptLimit: 3,
        answer: [0, 1],
        indirectTruthTable: {
          prompt: '<div class=instructions>Construct an indirect truth table for the following argument using the indirect truth table sandbox below to determine whether it is valid or invalid. Then answer the questions that follow.</div> <div> <strong> Note: </strong> The indirect truth table is not graded. </div>',
          argument: {
            premises: ['~K ∨ L', '~K'],
            conclusion: '~L',
          },
          questions: [
            {
              prompt: 'Select the correct statement:',
              choices: [
                'When "~L" is False, both "~K ∨ L " and "~K" can be true.',
                'When "~L" is False, both "~K ∨ L " and "~K" must be false.',
                'When "~L" is False, either "~K ∨ L " or "~K" must be false.',
                'When "~L" is False, the truth values of "~K ∨ L " are "~K" are not determined.',
              ],
              answerIndex: 0,
            },
            {
              prompt: 'Select the correct statement:',
              choices: [
                'The given argument is valid.',
                'The given argument is invalid.',
                'The validity of the argument is unknown.',
              ],
              answerIndex: 1,
            },
          ],
        },
      },
      {
        id: 'sandbox-practice-4-q-5',
        questionId: 'sandbox-practice-4-q-5',
        type: 'indirect-truth-table',
        attemptLimit: 3,
        answer: [4, 3, 0],
        indirectTruthTable: {
          prompt: '<div class=instructions>Construct an indirect truth table for the following set of statements using the indirect truth table sandbox below to determine whether it is consistent or inconsistent. Then answer the questions that follow</div> <div> <strong> Note: </strong> The indirect truth table is not graded. </div>',
          argument: {
            premises: ['(M ∨ D) ≡ G', 'M ⊃ ~(D ∨ K)', 'K ⊃G', 'D ⊃ K'],
          },
          questions: [
            {
              prompt: 'Select the correct statement:',
              choices: [
                `The truth of "(M ∨ D) ≡ G" determines all of its components' truth values.`,
                `The truth of "M ⊃ ~(D ∨ K)" determines all of its components' truth values.`,
                `The truth of "K ⊃G" determines all of its components' truth values.`,
                `The truth of "D ⊃ K" determines all of its components' truth values.`,
                'None of them determines all of its components\' truth values.',
              ],
              answerIndex: 4,
            },
            {
              prompt: 'Select the incorrect statement:',
              choices: [
                'When both "K" and "G" are false, all the statements in the given set can be true at the same time.',
                'When both "K" and "G" are true, all the statements in the given set can be true at the same time.',
                'When both "D" and "K" are true, all the statements in the given set can be true at the same time.',
                'When both "M" and "D" are true, all the statements in the given set can be true at the same time.',
              ],
              answerIndex: 3,
            },
            {
              prompt: '(c) Select the correct statement:',
              choices: ['Consistent', 'Inconsistent', 'Unknown'],
              answerIndex: 0,
            },
          ],
        },
      },
    ],
  },
]

export const getSandboxPractices = () => (
  clonePracticesWithoutDueDates(SANDBOX_PRACTICES)
)

export const getSandboxClassroomAnalytics = () => {
  const assignments = getSandboxAssignments()
  return {
    assignments: {
      upcoming: 2,
      pending: 1,
      overdue: 0,
      total: assignments.length,
      pastDueDateCount: 0,
      upcomingList: assignments.slice(1, 3).map((assignment) => ({
        id: assignment.id,
        title: assignment.title,
        due_at: assignment.due_at,
      })),
    },
    time: {
      avg_minutes_per_question: 7.8,
      median_minutes_per_question: 6.5,
      p75_minutes_per_question: 9.8,
      cohort_median_minutes_per_question: 7.2,
    },
  }
}

export const getSandboxGradebookSummary = () => {
  const assignments = getSandboxAssignments()
  return {
    class_avg_with_drop: 84.7,
    assignments: [
      {
        id: assignments[0].id,
        title: assignments[0].title,
        due_at: assignments[0].due_at,
        is_locked: false,
        avg_percent: 0.79,
        median_percent: 0.81,
      },
      {
        id: assignments[1].id,
        title: assignments[1].title,
        due_at: assignments[1].due_at,
        is_locked: false,
        avg_percent: 0.82,
        median_percent: 0.84,
      },
      {
        id: assignments[2].id,
        title: assignments[2].title,
        due_at: assignments[2].due_at,
        is_locked: false,
        avg_percent: 0.86,
        median_percent: 0.88,
      },
    ],
  }
}

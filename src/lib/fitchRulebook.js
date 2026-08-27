// Dr. Yuna Won's Fitch Natural Deduction Rulebook 

export const FITCH_DEFINITIONS = [
  {
    text: 'A sentence is available at a given point in a natural deduction proof if it occurs on an earlier line and is not contained in a discharged (closed) subproof. In other words, it must appear either in the current subproof or in an outer subproof that contains the current one.',
    bold: ['available'],
  },
  {
    text: 'A subproof is discharged when you finish using the assumption that opened the subproof and apply a rule that allows you to close it. Once discharged, the assumption is no longer available outside that subproof.',
    bold: ['subproof', 'discharged'],
  },
]

export const FITCH_TFL_RULE_GROUPS = [
  {
    title: '12 Basic Rules',
    start: 1,
    rules: [
      { name: '∧I', title: 'Conjunction Introduction', forms: ['A, B / A ∧ B'], description: 'The Conjunction Introduction rule (∧I) allows us to combine sentences on two different lines into a conjunction, provided that both lines are available.', bold: ['Conjunction Introduction'] },
      { name: '∧E', title: 'Conjunction Elimination', forms: ['A ∧ B / A', 'A ∧ B / B'], description: 'The Conjunction Elimination rule (∧E) allows us to derive either conjunct of a conjunction on a line by itself.', bold: ['Conjunction Elimination'] },
      { name: '→I', title: 'Conditional Introduction', forms: ['subproof A ⟹ B / A → B'], description: 'The Conditional Introduction rule (→I) allows us to derive a conditional by opening a subproof with its antecedent as an assumption and deriving its consequent within that subproof.', bold: ['Conditional Introduction'], note: 'This rule involves a subproof starting with an additional assumption (AS). You discharge the subproof by writing a new conditional sentence outside of the subproof.' },
      { name: '→E', title: 'Conditional Elimination', forms: ['A → B, A / B'], description: 'The conditional elimination rule (→E) allows us to derive the consequent of a conditional if the conditional and its antecedent are available sentences.' },
      { name: '↔I', title: 'Biconditional Introduction', forms: ['subproof A ⟹ B, subproof B ⟹ A / A ↔ B'], description: 'The Biconditional Introduction rule (↔I) allows us to derive a biconditional by performing two subproofs: one from left to right and the other from right to left.', bold: ['Biconditional Introduction'] },
      { name: '↔E', title: 'Biconditional Elimination', forms: ['A ↔ B, A / B', 'A ↔ B, B / A'], description: 'The Biconditional Elimination rule (↔E) allows us to use a biconditional in either direction when we have either its left-hand or right-hand subsentence in the proof.', bold: ['Biconditional Elimination'] },
      { name: '∨I', title: 'Disjunction Introduction', forms: ['A / A ∨ B', 'A / B ∨ A'], description: 'The Disjunction Introduction rule (∨I) allows us to derive a disjunction from an available sentence by connecting it with any sentence using ∨, either on the left or on the right.', bold: ['Disjunction Introduction'] },
      { name: '∨E', title: 'Disjunction Elimination', forms: ['A ∨ B, subproof A ⟹ C, subproof B ⟹ C / C'], description: 'The Disjunction Elimination (∨E) rule allows us to derive a sentence from a disjunction when we can derive that same sentence from each of its disjuncts in separate subproofs.', bold: ['Disjunction Elimination'], note: 'Both subproofs for ∨E must end with the same conclusion, with each subproof beginning with one of the disjuncts as an assumption. The justification must include the rule name (∨E) and the line numbers of the disjunction and both subproofs.', noteLabelBold: true },
      { name: '¬I', title: 'Negation Introduction', forms: ['subproof A ⟹ ⊥ / ¬A'], description: 'The Negation Introduction rule (¬I) allows us to derive a negated sentence by showing that assuming the unnegated sentence for a subproof leads to a contradiction (⊥).', bold: ['Negation Introduction'] },
      { name: '¬E', title: 'Negation Elimination', forms: ['A, ¬A / ⊥'], description: 'The Negation Elimination rule (¬E) allows us to derive a contradiction (⊥) by having both a sentence and its negation available in the proof.', bold: ['Negation Elimination'] },
      { name: 'IP', title: 'Indirect Proof', forms: ['subproof ¬A ⟹ ⊥ / A'], description: 'The Indirect Proof rule (IP) allows us to derive a sentence by showing that assuming its negation leads to a contradiction.', bold: ['Indirect Proof'], note: '¬I and IP are different rules. ¬I is used to derive a negated sentence, while IP is used to derive an unnegated sentence by showing that assuming its negation leads to a contradiction.', noteBold: ['¬I', 'IP'], noteLabelBold: true },
      { name: 'X', title: 'Explosion', forms: ['⊥ / A'], description: 'The Explosion rule (X) allows us to derive any sentence from a contradiction (⊥).', bold: ['Explosion'] },
    ],
  },
  {
    title: 'Derived Rules',
    start: 13,
    rules: [
      { name: 'R', title: 'Reiteration', forms: ['A / A'], description: 'The Reiteration rule (R) allows us to repeat any available sentence on a new line. A sentence is available if it does not occur within a discharged subproof.', bold: ['Reiteration'] },
      { name: 'DS', title: 'Disjunctive Syllogism', forms: ['A ∨ B, ¬A / B', 'A ∨ B, ¬B / A'], description: 'The Disjunctive Syllogism rule (DS) allows us to derive one disjunct from a disjunction when we have the negation of the other disjunct.', bold: ['Disjunctive Syllogism'] },
      { name: 'MT', title: 'Modus Tollens', forms: ['A → B, ¬B / ¬A'], description: 'The Modus Tollens rule (MT) allows us to derive the negation of the antecedent of a conditional when we have the negation of its consequent.', bold: ['Modus Tollens'] },
      { name: 'DNE', title: 'Double Negation Elimination', forms: ['¬¬A / A'], description: 'The Double Negation Elimination rule (DNE) allows us to derive an unnegated sentence from its double negation.', bold: ['Double Negation Elimination'] },
      { name: 'LEM', title: 'The Law of Excluded Middle', forms: ['subproof A ⟹ C, subproof ¬A ⟹ C / C'], description: 'The Law of Excluded Middle rule (LEM) allows us to derive a sentence by showing, in two separate subproofs, that the same sentence follows from both a sentence and its negation.', bold: ['Law of Excluded Middle'], note: 'You can think of it as ∨E applied to A ∨ ¬A, and A can be any sentence.' },
      { name: 'DeM', title: 'De Morgan’s Rule', forms: ['¬(A ∧ B) / ¬A ∨ ¬B', '¬A ∨ ¬B / ¬(A ∧ B)', '¬(A ∨ B) / ¬A ∧ ¬B', '¬A ∧ ¬B / ¬(A ∨ B)'], description: 'De Morgan’s rule (DeM) allows us to replace a negated conjunction with a disjunction of the negated conjuncts, or a negated disjunction with a conjunction of the negated disjuncts, and vice versa. So there are four versions of the rule.', bold: ['De Morgan’s'] },
    ],
  },
]

export const FITCH_FOL_RULE_GROUPS = [{
  start: 1,
  rules: [
    { name: '∀E', title: 'Universal Elimination', forms: ['∀xFx / Fa'], description: 'The Universal Elimination rule (∀E) allows us to derive a sentence about a particular individual from a universally quantified sentence.', bold: ['Universal Elimination'], notes: [{ text: 'When using the ∀E rule, replace every occurrence of the variable governed by the universal quantifier with the same name. The name may be one that has already appeared in the proof or a new name.' }, { text: 'The sentence resulting from an application of the ∀E rule is called a substitution instance.', bold: ['substitution instance'] }] },
    { name: '∀I', title: 'Universal Introduction', forms: ['Fa / ∀xFx'], description: 'The Universal Introduction rule (∀I) allows us to derive a universally quantified sentence from a substitution instance containing an arbitrary name that does not appear in any premises or undischarged assumptions.', bold: ['Universal Introduction'] },
    { name: '∃I', title: 'Existential Introduction', forms: ['Fa / ∃xFx'], description: 'The Existential Introduction rule (∃I) allows us to derive an existentially quantified sentence from one of its substitution instances.', bold: ['Existential Introduction'] },
    { name: '∃E', title: 'Existential Elimination', forms: ['∃xFx, subproof Fa ⟹ B / B'], description: 'The Existential Elimination rule (∃E) allows us to derive a sentence from an existentially quantified sentence by opening a subproof with a substitution instance containing a new arbitrary name and deriving the desired conclusion within that subproof.', bold: ['Existential Elimination'], notes: [{ text: 'The arbitrary name must not occur in any assumption undischarged before the existential premise.' }, { text: 'The arbitrary name must not occur in the existential premise.' }, { text: 'The arbitrary name must not occur in the conclusion.' }] },
    { name: 'CQ', title: 'Conversion of Quantifiers', forms: ['∀xAx :: ¬∃x¬Ax', '∃xAx :: ¬∀x¬Ax'], description: 'The Conversion of Quantifiers rule (CQ) allows us to convert between universal and existential quantifiers by changing the quantifier and appropriately moving the negation. This rule holds because the following two pairs of formulas are logically equivalent.', bold: ['Conversion of Quantifiers'] },
    { name: '=I', title: 'Identity Introduction', forms: ['a = a'], description: 'The Identity Introduction rule (=I) allows us to derive a statement that any name is identical to itself.', bold: ['Identity Introduction'] },
    { name: '=E', title: 'Identity Elimination', forms: ['a = b, Fa / Fb', 'a = b, Fb / Fa'], description: 'The Identity Elimination rule (=E) allows us to substitute one name for another when we know that the two names refer to the same object.', bold: ['Identity Elimination'] },
  ],
}]

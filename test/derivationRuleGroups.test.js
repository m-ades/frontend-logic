import test from 'node:test'
import assert from 'node:assert/strict'
import {
  getDerivationRules,
  groupDerivationRules,
  isSameDerivationRule,
} from '../src/lib/derivationRules.js'

const groupsOf = (rules, logicSystem) => groupDerivationRules(rules, logicSystem)
  .map(({ key, rules: grouped }) => [key, grouped])

test('every fitch rule lands in a named group, in textbook order', () => {
  assert.deepEqual(groupsOf(getDerivationRules('fitch'), 'fitch'), [
    ['introduction', ['∧I', '∨I', '→I', '↔I', '¬I', '∀I', '∃I', '=I']],
    ['elimination', ['∧E', '∨E', '→E', '↔E', '¬E', '∀E', '∃E', '=E']],
    ['basic', ['AS', 'R', 'X', 'IP']],
    ['derived', ['DS', 'MT', 'DNE', 'LEM', 'DeM', 'CQ']],
  ])
})

test('every hurley rule lands in a named group, in textbook order', () => {
  assert.deepEqual(groupsOf(getDerivationRules('hurley'), 'hurley'), [
    ['implication', ['MP', 'MT', 'HS', 'DS', 'CD', 'Simp', 'Conj', 'Add']],
    ['replacement', ['DM', 'Com', 'Assoc', 'Dist', 'DN', 'Trans', 'Impl', 'Equiv', 'Exp', 'Taut']],
    ['proof', ['ACP', 'CP', 'AIP', 'IP']],
    ['predicate', ['UI', 'UG', 'EI', 'EG', 'QN', '=I', '=O']],
  ])
})

test('a rule both systems share goes in each system own family', () => {
  const shared = ['MT', 'DS', 'IP']
  assert.deepEqual(groupsOf(shared, 'fitch'), [['basic', ['IP']], ['derived', ['DS', 'MT']]])
  assert.deepEqual(groupsOf(shared, 'hurley'), [['implication', ['MT', 'DS']], ['proof', ['IP']]])
})

test('only allowed rules show and empty groups are dropped', () => {
  assert.deepEqual(groupsOf(['→E', 'AS', 'R', '∨E'], 'fitch'), [
    ['elimination', ['∨E', '→E']],
    ['basic', ['AS', 'R']],
  ])
})

test('a rule no group names still shows, at the end', () => {
  assert.deepEqual(groupsOf(['→E', 'Newrule'], 'fitch'), [
    ['elimination', ['→E']],
    ['other', ['Newrule']],
  ])
})

test('names match without case or a text style selector, and come back as given', () => {
  // the symbol buttons type the biconditional with a text style selector
  const styled = '↔︎I'
  assert.deepEqual(groupsOf([styled, 'dem'], 'fitch'), [
    ['introduction', [styled]],
    ['derived', ['dem']],
  ])
  assert.equal(isSameDerivationRule(styled, '↔I'), true)
  assert.equal(isSameDerivationRule('DeM', 'dem'), true)
  assert.equal(isSameDerivationRule('', ''), false)
  assert.equal(isSameDerivationRule('→E', '→I'), false)
})

test('duplicates and empty input are handled', () => {
  assert.deepEqual(groupsOf(['R', 'R'], 'fitch'), [['basic', ['R']]])
  for (const input of [[], undefined, null, 'R']) {
    assert.deepEqual(groupDerivationRules(input, 'fitch'), [])
  }
})

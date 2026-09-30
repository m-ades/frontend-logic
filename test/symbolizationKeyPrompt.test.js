import test from 'node:test'
import assert from 'node:assert/strict'
import { parseSymbolizationKeyFromPrompt } from '../src/components/problems/mui/translation/symbolizationKeyboard.js'

test('reads key entries after a symbolization key heading', () => {
  const prompt = 'Symbolize this.<br>Symbolization key: <br>P = it rains<br>Q: it pours'
  assert.deepEqual(parseSymbolizationKeyFromPrompt(prompt), ['P =', 'Q:'])
})

test('reads whole key lines when the prompt has no heading', () => {
  const prompt = 'Symbolize the argument.\n\nNote: use "/" between premises.\n\nE = The Eiffel Tower was completed\nL = The Statue of Liberty was completed'
  assert.deepEqual(parseSymbolizationKeyFromPrompt(prompt), ['E =', 'L ='])
})

test('reads indexed key lines without a heading', () => {
  const prompt = 'Symbolize it.\nE_1 = Ella sings\nE₂ = Ella dances'
  assert.deepEqual(parseSymbolizationKeyFromPrompt(prompt, true), ['E_1 =', 'E_2 ='])
})

test('ignores prose without a heading or key lines', () => {
  assert.deepEqual(parseSymbolizationKeyFromPrompt('Note: x = y only if it rains'), [])
})

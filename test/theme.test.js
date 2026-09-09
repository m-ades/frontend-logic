import assert from 'node:assert/strict'
import test from 'node:test'
import { getAppTheme } from '../src/theme.js'

test('reuses each theme across repeated mode changes', () => {
  const dark = getAppTheme('dark')
  const light = getAppTheme('light')

  assert.notStrictEqual(dark, light)
  for (let index = 0; index < 10; index += 1) {
    assert.strictEqual(getAppTheme('dark'), dark)
    assert.strictEqual(getAppTheme('light'), light)
  }
  assert.equal(dark.palette.mode, 'dark')
  assert.equal(light.palette.mode, 'light')
})

test('legacy and unrecognized names reuse the light theme', () => {
  const light = getAppTheme('light')

  for (const name of ['default', 'unknown', '', undefined, null]) {
    assert.strictEqual(getAppTheme(name), light)
  }
})

import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, test } from 'node:test'
import { build } from 'esbuild'

const { outputFiles } = await build({
  entryPoints: [fileURLToPath(new URL('../src/lib/mathJax.js', import.meta.url))],
  bundle: true,
  write: false,
  format: 'esm',
  plugins: [{
    name: 'asset-urls',
    setup(build) {
      build.onResolve({ filter: /\?url$/ }, ({ path }) => ({
        path: `data:text/javascript,${encodeURIComponent(`export default ${JSON.stringify(path)}`)}`,
        external: true,
      }))
    },
  }],
})
const { typesetMath, typesetTex } = await import(
  `data:text/javascript;base64,${Buffer.from(outputFiles[0].text).toString('base64')}`
)

let retained
let runtime

beforeEach(() => {
  retained = new Set()
  runtime = {
    __lpSafeConfigured: true,
    typesetClear(elements) {
      elements.forEach((element) => retained.delete(element))
    },
    async typesetPromise(elements) {
      elements.forEach((element) => retained.add(element))
    },
  }
  globalThis.window = { MathJax: runtime }
})

afterEach(async () => {
  await typesetMath([])
  delete globalThis.window
})

const element = () => ({ isConnected: true, textContent: '' })
const deferred = () => {
  let resolve
  const promise = new Promise((done) => { resolve = done })
  return { promise, resolve }
}

test('chapter navigation releases old math and preserves the practice pane', async () => {
  const practice = element()
  const practiceController = new AbortController()
  await typesetTex(practice, 'P', false, { signal: practiceController.signal })

  for (let index = 0; index < 40; index += 1) {
    const chapter = element()
    const controller = new AbortController()
    await typesetMath([chapter], { signal: controller.signal })
    assert.deepEqual(retained, new Set([practice, chapter]))

    chapter.isConnected = false
    controller.abort()
    await typesetMath([])
    assert.deepEqual(retained, new Set([practice]))
  }

  practice.isConnected = false
  practiceController.abort()
  await typesetMath([])
  assert.equal(retained.size, 0)
})

test('abandoned requests skip loading and leave their content untouched', async () => {
  const abandoned = element()
  const controller = new AbortController()
  controller.abort()
  delete globalThis.window

  await typesetMath([abandoned], { signal: controller.signal })
  await typesetTex(abandoned, 'P', true, { signal: controller.signal })
  await typesetMath([{ isConnected: false }])
  assert.equal(abandoned.textContent, '')
})

test('abort during rendering clears late math before the next chapter starts', async () => {
  const previous = element()
  const next = element()
  const controller = new AbortController()
  const started = deferred()
  const finish = deferred()
  const events = []
  runtime.typesetClear = (elements) => {
    events.push(['clear', ...elements])
    elements.forEach((item) => retained.delete(item))
  }
  runtime.typesetPromise = async (elements) => {
    events.push(['render', ...elements])
    if (elements.includes(previous)) {
      started.resolve()
      await finish.promise
    }
    elements.forEach((item) => retained.add(item))
  }

  const pending = typesetMath([previous], { signal: controller.signal })
  await started.promise
  previous.isConnected = false
  controller.abort()
  const following = typesetMath([next])
  assert.deepEqual(events, [['clear', previous], ['render', previous]])

  finish.resolve()
  await Promise.all([pending, following])
  assert.deepEqual(events, [
    ['clear', previous], ['render', previous], ['clear', previous],
    ['clear', next], ['render', next],
  ])
  assert.deepEqual(retained, new Set([next]))
})

test('an element disconnected during rendering releases its math without a signal', async () => {
  const chapter = element()
  runtime.typesetPromise = async () => {
    chapter.isConnected = false
    retained.add(chapter)
  }
  await typesetMath([chapter])
  assert.equal(retained.size, 0)
})

test('a failed render releases partial math and does not block later requests', async () => {
  const broken = element()
  const next = element()
  runtime.typesetPromise = async (elements) => {
    elements.forEach((item) => retained.add(item))
    if (elements.includes(broken)) throw new Error('render failed')
  }

  await assert.rejects(typesetMath([broken]), /render failed/)
  assert.equal(retained.size, 0)
  await typesetMath([next])
  assert.deepEqual(retained, new Set([next]))
})

test('cancelled queued formula updates cannot overwrite the newest formula', async () => {
  const formula = element()
  const previous = new AbortController()
  const current = new AbortController()

  const pending = typesetTex(formula, 'P', true, { signal: previous.signal })
  previous.abort()
  const latest = typesetTex(formula, 'Q', false, { signal: current.signal })
  await Promise.all([pending, latest])
  assert.equal(formula.textContent, '\\(Q\\)')
  assert.deepEqual(retained, new Set([formula]))

  current.abort()
  await typesetMath([])
  assert.equal(retained.size, 0)
})

test('cleanup of completed math runs before reusing its container', async () => {
  const formula = element()
  const previous = new AbortController()
  await typesetTex(formula, 'P', true, { signal: previous.signal })
  previous.abort()
  await typesetTex(formula, 'Q')

  assert.equal(formula.textContent, '\\[Q\\]')
  assert.deepEqual(retained, new Set([formula]))
})

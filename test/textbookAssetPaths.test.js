import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { rewriteAssetSrc, rewriteHref } from '../src/components/textbook/prepareTextbookHtml.js'
import { buildRuntimePaths } from '../src/runtime/sandboxRuntime.js'

const root = fileURLToPath(new URL('..', import.meta.url))
const readJson = (file) => JSON.parse(readFileSync(path.join(root, file), 'utf8'))
const manifest = readJson('src/components/textbook/textbookManifest.json')
const inventory = readJson('src/components/textbook/textbookInventory.json')
const config = readJson('vercel.json')
const headersFor = (pathname) => config.headers
  .filter(({ source }) => new RegExp(`^${source.replace('/:path*', '(?:/.*)?')}$`).test(pathname))
  .flatMap(({ headers }) => headers)
const blocksScripts = (pathname) => headersFor(pathname).some(({ key, value }) => (
  key.toLowerCase() === 'content-security-policy' && value.includes("script-src 'none'")
))

test('application textbook routes can load scripts and do not resolve to static pages', () => {
  for (const role of ['student', 'instructor']) {
    const routes = buildRuntimePaths(role)
    for (const pathname of [routes.textbookPath, routes.textbookChapterPath('Ch6')]) {
      assert.equal(blocksScripts(pathname), false, pathname)
      assert.equal(blocksScripts(`${pathname}/`), false, pathname)
      assert.equal(existsSync(path.join(root, 'public', pathname)), false, pathname)
    }
  }
})

test('every bundled textbook file remains under the script blocking policy', () => {
  assert.equal(blocksScripts(manifest.assetBase), true)
  const visit = (directory) => {
    for (const entry of readdirSync(path.join(root, 'public', directory), { withFileTypes: true })) {
      const pathname = `${directory}/${entry.name}`
      if (entry.isDirectory()) visit(pathname)
      else assert.equal(blocksScripts(pathname), true, pathname)
    }
  }
  visit(manifest.assetBase)
})

test('chapter navigation and static resources resolve in their respective namespaces', () => {
  assert.equal(inventory.assetBase, manifest.assetBase)
  const staticPaths = [
    ...manifest.stylesheets,
    ...inventory.files.map(({ file }) => `${inventory.assetBase}/${file}`),
    rewriteAssetSrc('bmlimages/forallxyyc-html-1.svg'),
    rewriteHref('forallxyyc.pdf', '/textbook'),
  ]
  for (const pathname of staticPaths) {
    assert.equal(pathname.startsWith(`${manifest.assetBase}/`), true, pathname)
    assert.equal(existsSync(path.join(root, 'public', pathname)), true, pathname)
  }
  for (const linkBase of ['/textbook', '/sandbox/student/textbook', '/sandbox/instructor/textbook']) {
    assert.equal(rewriteHref('Ch7.html#Sx1', linkBase), `${linkBase}/Ch7#Sx1`)
  }
})

test('legacy file links redirect to assets without redirecting app routes', () => {
  const redirect = config.redirects.find(({ destination }) => destination === `${manifest.assetBase}/:file`)
  assert.ok(redirect)
  const pattern = new RegExp(`^${redirect.source.replace(':file', '')}$`)
  for (const filename of ['Ch6.html', 'index.html', 'bmlimages/forallxyyc-html-1.svg', 'forallxyyc.pdf']) {
    assert.equal(pattern.exec(`/textbook/${filename}`)?.[1], filename)
  }
  for (const pathname of ['/textbook', '/textbook/', '/textbook/Ch6', '/textbook/index']) {
    assert.equal(pattern.test(pathname), false)
  }
})

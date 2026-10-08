/**
 * Build a textbook catalog from a BookML SCORM bundle on disk.
 *
 * Two jobs, same parser the app uses at runtime:
 *
 *   --out <file>           write hula-textbook.json for publishing beside the
 *                          bundle, so the app does not have to infer anything
 *   --refresh-fallback     rewrite the manifest + inventory this repo ships as
 *                          the offline fallback
 *
 * Reading the bundle from disk lets this recover each chapter's real page
 * title, which the runtime parser cannot do without fetching every file.
 *
 * Usage:
 *   node scripts/build-textbook-catalog.mjs --out public/textbook-assets/hula-textbook.json
 *   node scripts/build-textbook-catalog.mjs --refresh-fallback
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildTextbookCatalog } from '../src/components/textbook/bookmlCatalog.js'
import { stripNumberPrefix } from '../src/components/textbook/textbookTitles.js'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

function arg(name, fallback = null) {
  const index = process.argv.indexOf(name)
  return index === -1 ? fallback : process.argv[index + 1] ?? fallback
}

const bundleDir = path.resolve(root, arg('--bundle', 'public/textbook-assets'))
const assetBase = arg('--asset-base', '/textbook-assets')
const outPath = arg('--out')
const refreshFallback = process.argv.includes('--refresh-fallback')

const read = (file) => {
  const full = path.join(bundleDir, file)
  return fs.existsSync(full) ? fs.readFileSync(full, 'utf8') : ''
}

/** BookML titles pages "<page> ‣ <ancestors> ‣ <book>"; only the first part is ours. */
function pageTitleOf(file) {
  const match = /<title>([\s\S]*?)<\/title>/i.exec(read(file))
  if (!match) return null
  const title = match[1].split('‣')[0].replace(/\s+/g, ' ').trim()
  return title || null
}

const catalog = buildTextbookCatalog({
  indexHtml: read('index.html'),
  imsManifestXml: read('imsmanifest.xml'),
  assetBase,
  source: 'published',
})

if (catalog.entries.length === 0) {
  console.error(`No table of contents found in ${path.join(bundleDir, 'index.html')}`)
  process.exit(1)
}

catalog.entries = catalog.entries.map((entry) => ({
  ...entry,
  pageTitle: pageTitleOf(entry.file) || entry.pageTitle,
}))

const titleBySlug = new Map(catalog.entries.map((entry) => [entry.slug, entry]))
catalog.files = catalog.files.map((file) => {
  const entry = titleBySlug.get(file.slug)
  const display = entry?.pageTitle || entry?.title || file.displayTitle
  return { ...file, displayTitle: stripNumberPrefix(display) || display }
})

const write = (target, value) => {
  fs.writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`)
  console.log(`Wrote ${path.relative(root, target)}`)
}

if (outPath) {
  const { files, source, ...published } = catalog
  write(path.resolve(root, outPath), { ...published, files })
}

if (refreshFallback) {
  const { files, source, ...manifest } = catalog
  write(path.join(root, 'src/components/textbook/textbookManifest.json'), manifest)
  write(path.join(root, 'src/components/textbook/textbookInventory.json'), {
    generatedAt: new Date().toISOString(),
    assetBase: catalog.assetBase,
    files,
  })
}

if (!outPath && !refreshFallback) {
  console.log(
    `${catalog.bookTitle} — ${catalog.entries.length} entries, ${catalog.files.length} files`,
  )
  console.log('Pass --out <file> or --refresh-fallback to write output.')
}

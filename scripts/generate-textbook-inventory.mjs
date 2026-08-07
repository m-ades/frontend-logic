/**
 * Regenerate textbook file inventory after dropping a new BookML HTML build
 * into public/textbook/.
 *
 * Usage (from frontend-logic):
 *   node scripts/generate-textbook-inventory.mjs
 *
 * Then use Instructor → Textbook → Sync from bundle to merge into course structure.
 *
 * Note: Pt* / Ptx* files are inventoried for sync identity but HuLA treats them as
 * TOC dividers only (not Learn destinations). Chapter HTML files are the reading units.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const publicDir = path.join(root, 'public/textbook')
const manifestPath = path.join(root, 'src/components/textbook/textbookManifest.json')
const outPath = path.join(root, 'src/components/textbook/textbookInventory.json')

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
const bySlug = Object.fromEntries((manifest.entries || []).map((e) => [e.slug, e]))

function inferKind(stem) {
  if (stem === 'index') return 'cover'
  if (stem === 'Chx1' || /^Chx\d+$/i.test(stem)) return 'preface'
  if (/^Ptx\d+$/i.test(stem)) return 'backmatter'
  if (/^Pt\d+$/i.test(stem)) return 'part'
  if (/^A\d+[a-z]?$/i.test(stem)) return 'appendix'
  if (/^Ch\d+$/i.test(stem)) return 'chapter'
  return 'chapter'
}

function stripNumberPrefix(title) {
  if (!title) return title
  return title
    .replace(/^Part\s+[IVXLCDM]+\s+/i, '')
    .replace(/^Chapter\s+\d+\s+/i, '')
    .replace(/^[IVXLCDM]+\s+/, '')
    .replace(/^\d+\s+/, '')
    .trim()
}

const files = fs.readdirSync(publicDir).filter((f) => f.endsWith('.html')).sort()
const inventory = {
  generatedAt: new Date().toISOString(),
  assetBase: '/textbook',
  files: files.map((file) => {
    const slug = file.replace(/\.html$/i, '')
    const entry = bySlug[slug]
    const kind = entry?.kind || inferKind(slug)
    let displayTitle = entry?.pageTitle || entry?.title || slug
    if (slug === 'index') displayTitle = 'Cover & contents'
    displayTitle = stripNumberPrefix(displayTitle) || displayTitle
    return { slug, file, kind, displayTitle }
  }),
}

fs.writeFileSync(outPath, `${JSON.stringify(inventory, null, 2)}\n`)
console.log(`Wrote ${outPath} (${inventory.files.length} files)`)

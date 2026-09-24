import { DEFAULT_LOGIC_SYSTEM, normalizeLogicSystem } from '../lib/logicSystems.js'
import { toRomanNumeral } from './romanNumerals.js'

// names for the chapter and subchapter fields in each course's textbook
const OUTLINE_TERMS = {
  fitch: { chapter: 'Part', subchapter: 'Chapter', formatChapterNumber: toRomanNumeral },
  hurley: { chapter: 'Chapter', subchapter: 'Subchapter', formatChapterNumber: String },
}

export const getOutlineTerms = (logicSystem) =>
  OUTLINE_TERMS[normalizeLogicSystem(logicSystem, DEFAULT_LOGIC_SYSTEM)] ?? OUTLINE_TERMS[DEFAULT_LOGIC_SYSTEM]

export const formatChapterLabel = (chapter, logicSystem) => {
  const chapterNum = Number(chapter) || null
  if (!chapterNum) return 'Other'
  const terms = getOutlineTerms(logicSystem)
  return `${terms.chapter} ${terms.formatChapterNumber(chapterNum)}`
}

export const formatSubchapterLabel = (subchapter, fallback, logicSystem) => {
  const label = String(subchapter ?? '').trim()
  if (!label) return fallback
  return `${getOutlineTerms(logicSystem).subchapter} ${label}`
}

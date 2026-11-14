import getSyntax, { closeBrackets, connectiveAliases, openBrackets } from '@logic-app/logic-engine/symbolic/libsyntax.js'
import { displayIndexedSymbolsForNotation } from '../../../lib/indexedSymbols.js'

/*
picks the connective for a typed > and how much ascii arrow before the caret it replaces
shafts match the engine's ascii arrows so <=> and => land like <-> and ->
an = may already be padded like identity since fields that prettify as you type space it out
*/
export function arrowShortcutBeforeCaret(textBeforeCaret) {
  const text = String(textBeforeCaret ?? '')
  const biconditional = text.match(/<(?:[-–]*|\s*=\s*)$/)
  if (biconditional) return { op: 'IFF', replaceBefore: biconditional[0].length }
  const shaft = text.match(/(?:[-–]*|=\s*)$/)
  return { op: 'IFTHEN', replaceBefore: shaft[0].length }
}

/*
a small text and caret buffer the shortcuts edit
replaceAround rewrites the text touching the caret and drops the caret after what it inserted
*/
function editBuffer(text, from, to, syntax) {
  let before = text.slice(0, from)
  let after = text.slice(to)
  const buffer = {
    get before() { return before },
    get prev() { return before.at(-1) },
    replaceAround(findBefore, replaceBefore, insert = '', findAfter = null, replaceAfter = '') {
      before = before.replace(findBefore, replaceBefore) + insert
      if (findAfter) after = after.replace(findAfter, replaceAfter)
      return buffer
    },
    // binary connectives get one space each side and a repeat like the second half of && or || adds nothing
    operator(op) {
      const symbol = syntax.symbols[op]
      if (syntax.symbolcat[op] < 2) {
        before += symbol
        return buffer
      }
      return buffer.replaceAround(/\s+$/, '', before.trimEnd().endsWith(symbol) ? ' ' : ` ${symbol} `, /^\s+/, '')
    },
    result() { return { text: before + after, caret: before.length } },
  }
  return buffer
}

/*
what typing one character does to a formula, or null when it just goes in
any character the engine reads as a connective becomes it, plus v for or, -> and <-> for arrows, - for not, XX for falsum, all and some for quantifiers
*/
export function typedEdit(text, from, to, key, { notation, allowTherefore = false } = {}) {
  const syntax = getSyntax(notation)
  const edit = editBuffer(text, from, to, syntax)
  const { before } = edit
  const aliased = connectiveAliases[key]

  // a second space in a row is dropped
  if (key === ' ' && /\s$/.test(before)) return edit.result()
  if (key === 'v' || key === '∨') return edit.operator('OR').result()
  if (aliased === 'IFTHEN') {
    const { op, replaceBefore } = arrowShortcutBeforeCaret(before)
    return edit.replaceAround(new RegExp(`\\s*[\\s\\S]{${replaceBefore}}$`), '', '', /^\s*/, '').operator(op).result()
  }
  if (key === '=') {
    if (/=\s*$/.test(before)) {
      return edit.replaceAround(/\s*=\s*$/, '', '', /^\s*/, '').operator('IFF').result()
    }
    if (/\/$/.test(before)) return edit.replaceAround(/\s*\/$/, ' ', '≠ ', /^\s*/, '').result()
    if (edit.prev === syntax.symbols.NOT) {
      return edit.replaceAround(new RegExp(`\\s*${syntax.symbols.NOT}$`), ' ', '≠ ', /^\s*/, '').result()
    }
  }
  if (key === '.' && allowTherefore && syntax.notationname === 'calgary' && /:\s*$/.test(before)) {
    return edit.replaceAround(/\s*:\s*$/, '', ' ∴ ', /^\s*/, '').result()
  }
  if (key === '&' && /&\s*$/.test(before)) {
    return edit.replaceAround(/\s*&\s*$/, '').operator('AND').result()
  }
  if (aliased) return edit.operator(aliased).result()
  // calgary writes indices as P_1 so an underscore after a letter is not falsum there
  const startsIndex = key === '_' && syntax.notationname === 'calgary' && /[A-Za-z]$/.test(before)
  if (key === '_' && !startsIndex) return edit.operator('FALSUM').result()
  if (key === 'X') {
    return edit.prev === 'X' ? edit.replaceAround(/\s*X$/, '', ` ${syntax.symbols.FALSUM}`).result() : null
  }
  if (key === '/') {
    if (/=\s*$/.test(before)) return edit.replaceAround(/\s*=\s*$/, ' ', '≠ ', /^\s*/, '').result()
    if (edit.prev === '\\') return edit.replaceAround(/\\$/, '').operator('OR').result()
    return null
  }
  if (/^all$/i.test(before.slice(-2) + key) && /^[lL]$/.test(key)) {
    return edit.replaceAround(/al$/i, '', '', /^\s*/, '').operator('FORALL').result()
  }
  if (/^some$/i.test(before.slice(-3) + key) && /^[eE]$/.test(key)) {
    return edit.replaceAround(/som$/i, '', '', /^\s*/, '').operator('EXISTS').result()
  }
  // hyphens left before anything but a digit, ? or another hyphen were negations
  if (edit.prev === '-' && !/[0-9?-]/.test(key)) {
    return edit.replaceAround(/-+$/, (dashes) => syntax.symbols.NOT.repeat(dashes.length), key).result()
  }
  return null
}

// a connective from a symbol button, spaced the same way typing it would be
export function operatorEdit(text, from, to, op, notation) {
  return editBuffer(text, from, to, getSyntax(notation)).operator(op).result()
}

/*
subscripts typed indices like P_1 and keeps the caret after the same text
returns null when nothing changes
*/
export function formatIndices(text, caret, notation) {
  const formatted = displayIndexedSymbolsForNotation(text, notation)
  if (formatted === text) return null
  return { text: formatted, caret: displayIndexedSymbolsForNotation(text.slice(0, caret), notation).length }
}

/*
one pass over the brackets, read relative to the caret when one is given
strays are closers that don't match the innermost open bracket
pending is the closers still owed, innermost first, shown greyed after the text with indices running on past its end
pair is the bracket beside the caret and its partner, checking the one before the caret first
scope is the innermost span around the caret through its closer, greyed counts the greyed closers it reaches
closer is what tab types, the closer of the bracket the caret sits directly inside if that bracket is unclosed
*/
export function scanBrackets(text, caret = -1) {
  const open = []
  const strays = []
  const partners = new Map()
  // the stack at the caret is the same whether or not the scan goes on past it
  let enclosing
  for (let at = 0; at < text.length; at++) {
    if (at === caret) enclosing = open.at(-1)
    if (openBrackets[text[at]]) {
      open.push({ at, closer: openBrackets[text[at]] })
    } else if (text[at] === open.at(-1)?.closer) {
      const opener = open.pop()
      partners.set(opener.at, at)
      partners.set(at, opener.at)
    } else if (closeBrackets[text[at]]) {
      strays.push(at)
    }
  }
  if (caret === text.length) enclosing = open.at(-1)
  open.forEach((opener, i) => {
    const greyed = text.length + open.length - 1 - i
    partners.set(opener.at, greyed)
    partners.set(greyed, opener.at)
  })
  const beside = [caret - 1, caret].find((at) => partners.has(at))
  const scopeEnd = enclosing && partners.get(enclosing.at) + 1
  return {
    strays,
    pending: open.map((b) => b.closer).reverse().join(''),
    pair: beside === undefined ? [] : [beside, partners.get(beside)],
    scope: enclosing
      ? { from: enclosing.at, to: Math.min(scopeEnd, text.length), greyed: Math.max(0, scopeEnd - text.length) }
      : null,
    closer: scopeEnd > text.length ? enclosing.closer : '',
  }
}

// the smallest single change that turns one string into another
export function diffChange(from, to) {
  let start = 0
  while (start < from.length && start < to.length && from[start] === to[start]) start += 1
  let end = 0
  while (end < from.length - start && end < to.length - start && from.at(-1 - end) === to.at(-1 - end)) end += 1
  return { from: start, to: from.length - end, insert: to.slice(start, to.length - end) }
}

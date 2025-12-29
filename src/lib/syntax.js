// this file formats user input before it gets sent

export const SYMBOLS = {
  OR: '∨',
  AND: '•',
  IFTHEN: '⊃',
  IFF: '≡',
  NOT: '~',
  FORALL: '∀',
  EXISTS: '∃',
  FALSUM: '✖'
}

export const inputFix = (s) => {
  if (!s) return ''
  // remove whitespace, then pad binary ops
  let rv = s.replace(/\s+/g, '')
  
  // convert plaintext shorthands to hurley notation
  rv = rv.replace(/-->/g, SYMBOLS.IFTHEN)
  rv = rv.replace(/->/g, SYMBOLS.IFTHEN)
  rv = rv.replace(/&/g, SYMBOLS.AND)
  rv = rv.replace(/\^/g, SYMBOLS.AND)
  
  rv = rv.replaceAll(SYMBOLS.OR, ` ${SYMBOLS.OR} `)
  rv = rv.replaceAll(SYMBOLS.AND, ` ${SYMBOLS.AND} `)
  rv = rv.replaceAll(SYMBOLS.IFTHEN, ` ${SYMBOLS.IFTHEN} `)
  rv = rv.replaceAll(SYMBOLS.IFF, ` ${SYMBOLS.IFF} `)
  rv = rv.replaceAll('=', ' = ')
  rv = rv.replaceAll('≠', ' ≠ ')
  return rv.trim()
}

export function handleFormulaHotkeys(e, insert) {
  if (e.key === ' ' && e.target?.value?.endsWith(' ')) { e.preventDefault(); return }
  if (['v','V','∨','|'].includes(e.key)) { e.preventDefault(); insert(SYMBOLS.OR); return }
  if (['^','&','·','•','*','.'].includes(e.key)) { e.preventDefault(); insert(SYMBOLS.AND); return }

  if (['~','!'].includes(e.key)) { e.preventDefault(); insert(SYMBOLS.NOT); return }

  if (['>','→','⊃'].includes(e.key)) { e.preventDefault(); insert(SYMBOLS.IFTHEN); return }

  if (e.key === '=' && e.target?.value?.endsWith('=')) { e.preventDefault();
    const v = e.target.value.slice(0,-1) + ' ' + SYMBOLS.IFF + ' '
    e.target.value = v; return }

  // / followed by = is ≠
  if (e.key === '/' && e.target?.value?.endsWith('=')) { e.preventDefault(); insert('≠'); return }

  if (e.key === 'A') { e.preventDefault(); insert(SYMBOLS.FORALL); return }

  if (e.key === 'E') { e.preventDefault(); insert(SYMBOLS.EXISTS); return }

  /* X twice to ⊥
  if (e.key === 'X' && e.target?.value?.endsWith('X')) { e.preventDefault();
    const v = e.target.value.slice(0,-1) + SYMBOLS.FALSUM
    e.target.value = v; return }
  */

}


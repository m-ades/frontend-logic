/*
converts canonical unicode logic formulas to tex presentation strings
the input remains authoritative and tex is never persisted
*/

const TEX_SYMBOLS = {
  '¬': String.raw`\neg `,
  '~': String.raw`\neg `,
  '∧': String.raw`\land `,
  '&': String.raw`\land `,
  '•': String.raw`\mathbin{\bullet} `,
  '∨': String.raw`\lor `,
  '→': String.raw`\to `,
  '⊃': String.raw`\supset `,
  '↔': String.raw`\leftrightarrow `,
  '≡': String.raw`\equiv `,
  '∀': String.raw`\forall `,
  '∃': String.raw`\exists `,
  '⊥': String.raw`\bot `,
  '✖': String.raw`\times `,
}

const TEX_ESCAPES = {
  '%': String.raw`\%`,
  '$': String.raw`\$`,
  '#': String.raw`\#`,
  '{': String.raw`\lbrace `,
  '}': String.raw`\rbrace `,
  '\\': String.raw`\backslash `,
}

const SUBSCRIPT_DIGITS = {
  '₀': '0',
  '₁': '1',
  '₂': '2',
  '₃': '3',
  '₄': '4',
  '₅': '5',
  '₆': '6',
  '₇': '7',
  '₈': '8',
  '₉': '9',
}

// converts one normalized logic formula to tex math content
export function logicFormulaToTex(formula) {
  const source = String(formula ?? '')
  let tex = ''

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index]

    if (character === '_' && /[0-9]/.test(source[index + 1] ?? '')) {
      let digits = ''
      while (/[0-9]/.test(source[index + 1] ?? '')) {
        index += 1
        digits += source[index]
      }
      tex += `_{${digits}}`
      continue
    }

    if (SUBSCRIPT_DIGITS[character]) {
      let digits = SUBSCRIPT_DIGITS[character]
      while (SUBSCRIPT_DIGITS[source[index + 1]]) {
        index += 1
        digits += SUBSCRIPT_DIGITS[source[index]]
      }
      tex += `_{${digits}}`
      continue
    }

    tex += TEX_SYMBOLS[character] ?? TEX_ESCAPES[character] ?? character
  }

  return tex.trim()
}

// combines formulas using comparison or argument punctuation
export function logicStatementsToTex(statements, isArgument = false) {
  if (!Array.isArray(statements) || statements.length === 0) return ''
  const formulas = statements.map(logicFormulaToTex)
  if (isArgument && formulas.length > 1) {
    return String.raw`${formulas.slice(0, -1).join(String.raw`,\quad `)}\quad\therefore\quad ${formulas.at(-1)}`
  }
  return formulas.join(String.raw`,\quad `)
}

const TEX_TEXT_ESCAPES = {
  '\\': String.raw`\textbackslash{}`,
  '{': String.raw`\{`,
  '}': String.raw`\}`,
  '$': String.raw`\$`,
  '&': String.raw`\&`,
  '#': String.raw`\#`,
  '%': String.raw`\%`,
  '_': String.raw`\_`,
  '^': String.raw`\textasciicircum{}`,
  '~': String.raw`\textasciitilde{}`,
}

// wraps a plain-language sentence (not logic notation) in tex text mode
export function plainTextToTex(text) {
  const source = String(text ?? '').trim()
  if (!source) return ''
  const escaped = [...source].map((character) => TEX_TEXT_ESCAPES[character] ?? character).join('')
  return String.raw`\text{${escaped}}`
}

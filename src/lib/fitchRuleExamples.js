const tex = String.raw
const ROW = String.raw`\\`
const A = String.raw`\mathscr{A}`
const B = String.raw`\mathscr{B}`
const C = String.raw`\mathscr{C}`

const line = (label, formula, justification = '') => ({ label, formula, justification })
const assumption = (label, formula) => line(
  label,
  tex`\hspace{-0.5em}\underline{\hspace{0.5em}${formula}}`,
  tex`\mathrm{AS}`
)
const subproof = (...lines) => ({ lines })

/*
a subproof renders as two arrays with matching rows
its labels go in the outer label column and its body sits beside its scope line
a nested subproof returns the same pair so every label reaches the outermost column
*/
function renderSubproof(lines) {
  const rows = lines.map((item) => {
    if (item.lines) {
      const nested = renderSubproof(item.lines)
      return { label: nested.labels, body: `&${nested.body}&` }
    }
    // one phantom per line keeps its label row as tall as its formula row
    const strut = tex`\vphantom{${item.label}${item.formula}${item.justification}}`
    return { label: `${strut}${item.label}`, body: `&${strut}${item.formula}&${item.justification}` }
  })
  return {
    labels: tex`\begin{array}{r}${rows.map((row) => row.label).join(ROW)}\end{array}`,
    // the empty first column keeps the scope line an inner rule so assumption underlines still reach it
    body: tex`\begin{array}{@{}l@{}|l@{\qquad}l}${rows.map((row) => row.body).join(ROW)}\end{array}`,
  }
}

const proof = (...lines) => {
  const rows = lines.map((item) => {
    if (item.lines) {
      const { labels, body } = renderSubproof(item.lines)
      return `${labels}&${body}`
    }
    return `${item.label}&${item.formula}${item.justification ? `&${item.justification}` : ''}`
  })
  return tex`\begin{array}{r|l@{\qquad}l}${rows.join(ROW)}\end{array}`
}
const stack = (...examples) => tex`\begin{gathered}${examples.join(String.raw`\\[1.1em]`)}\end{gathered}`


export const FITCH_RULE_EXAMPLES = {
  '∧I': [proof(line('m', A), line('n', B), line('', tex`${A}\land${B}`, tex`\land I\ m,n`))],
  '∧E': [stack(
    proof(line('m', tex`${A}\land${B}`), line('', A, tex`\land E\ m`)),
    proof(line('m', tex`${A}\land${B}`), line('', B, tex`\land E\ m`)),
  )],
  '→I': [proof(
    subproof(assumption('m', A), line('n', B)),
    line('', tex`${A}\to${B}`, tex`\to I\ m\text{-}n`),
  )],
  '→E': [proof(line('m', tex`${A}\to${B}`), line('n', A), line('', B, tex`\to E\ m,n`))],
  '↔I': [proof(
    subproof(assumption('i', A), line('j', B)),
    subproof(assumption('k', B), line('l', A)),
    line('', tex`${A}\leftrightarrow${B}`, tex`\leftrightarrow I\ i\text{-}j,k\text{-}l`),
  )],
  '↔E': [
    proof(line('m', tex`${A}\leftrightarrow${B}`), line('n', A), line('', B, tex`\leftrightarrow E\ m,n`)),
    proof(line('m', tex`${A}\leftrightarrow${B}`), line('n', B), line('', A, tex`\leftrightarrow E\ m,n`)),
  ],
  '∨I': [
    proof(line('m', A), line('', tex`${A}\lor${B}`, tex`\lor I\ m`)),
    proof(line('m', A), line('', tex`${B}\lor${A}`, tex`\lor I\ m`)),
  ],
  '∨E': [proof(
    line('m', tex`${A}\lor${B}`),
    subproof(assumption('i', A), line('j', C)),
    subproof(assumption('k', B), line('l', C)),
    line('', C, tex`\lor E\ m,i\text{-}j,k\text{-}l`),
  )],
  '¬I': [proof(
    subproof(assumption('i', A), line('j', tex`\bot`)),
    line('', tex`\neg${A}`, tex`\neg I\ i\text{-}j`),
  )],
  '¬E': [proof(line('m', tex`\neg${A}`), line('n', A), line('', tex`\bot`, tex`\neg E\ m,n`))],
  IP: [proof(
    subproof(assumption('i', tex`\neg${A}`), line('j', tex`\bot`)),
    line('', A, tex`\mathrm{IP}\ i\text{-}j`),
  )],
  X: [proof(line('m', tex`\bot`), line('', A, tex`\mathrm X\ m`))],
  R: [proof(line('m', A), line('', A, tex`\mathrm R\ m`))],
  DS: [
    proof(line('m', tex`${A}\lor${B}`), line('n', tex`\neg${A}`), line('', B, tex`\mathrm{DS}\ m,n`)),
    proof(line('m', tex`${A}\lor${B}`), line('n', tex`\neg${B}`), line('', A, tex`\mathrm{DS}\ m,n`)),
  ],
  MT: [proof(line('m', tex`${A}\to${B}`), line('n', tex`\neg${B}`), line('', tex`\neg${A}`, tex`\mathrm{MT}\ m,n`))],
  DNE: [proof(line('m', tex`\neg\neg${A}`), line('', A, tex`\mathrm{DNE}\ m`))],
  LEM: [proof(
    subproof(assumption('i', A), line('j', B)),
    subproof(assumption('k', tex`\neg${A}`), line('l', B)),
    line('', B, tex`\mathrm{LEM}\ i\text{-}j,k\text{-}l`),
  )],
  DeM: [stack(
    proof(line('m', tex`\neg(${A}\land${B})`), line('', tex`\neg${A}\lor\neg${B}`, tex`\mathrm{DeM}\ m`)),
    proof(line('m', tex`\neg${A}\lor\neg${B}`), line('', tex`\neg(${A}\land${B})`, tex`\mathrm{DeM}\ m`)),
    proof(line('m', tex`\neg(${A}\lor${B})`), line('', tex`\neg${A}\land\neg${B}`, tex`\mathrm{DeM}\ m`)),
    proof(line('m', tex`\neg${A}\land\neg${B}`), line('', tex`\neg(${A}\lor${B})`, tex`\mathrm{DeM}\ m`)),
  )],
  '∀E': [proof(line('m', tex`\forall x\,${A}(\ldots x\ldots)`), line('', tex`${A}(\ldots c\ldots)`, tex`\forall E\ m`))],
  '∀I': [proof(line('m', tex`${A}(\ldots c\ldots)`), line('', tex`\forall x\,${A}(\ldots x\ldots)`, tex`\forall I\ m`))],
  '∃I': [proof(line('m', tex`${A}(\ldots c\ldots)`), line('', tex`\exists x\,${A}(\ldots x\ldots)`, tex`\exists I\ m`))],
  '∃E': [proof(
    line('m', tex`\exists x\,${A}(\ldots x\ldots)`),
    subproof(assumption('i', tex`${A}(\ldots c\ldots)`), line('j', B)),
    line('', B, tex`\exists E\ m,i\text{-}j`),
  )],
  CQ: [stack(
    proof(line('m', tex`\forall x\,\neg${A}`), line('', tex`\neg\exists x\,${A}`, tex`\mathrm{CQ}\ m`)),
    proof(line('m', tex`\neg\exists x\,${A}`), line('', tex`\forall x\,\neg${A}`, tex`\mathrm{CQ}\ m`)),
    proof(line('m', tex`\exists x\,\neg${A}`), line('', tex`\neg\forall x\,${A}`, tex`\mathrm{CQ}\ m`)),
    proof(line('m', tex`\neg\forall x\,${A}`), line('', tex`\exists x\,\neg${A}`, tex`\mathrm{CQ}\ m`)),
  )],
  '=I': [proof(line('', tex`c=c`, tex`{=}I`))],
  '=E': [
    proof(line('m', tex`a=b`), line('n', tex`${A}(\ldots a\ldots)`), line('', tex`${A}(\ldots b\ldots)`, tex`{=}E\ m,n`)),
    proof(line('m', tex`a=b`), line('n', tex`${A}(\ldots b\ldots)`), line('', tex`${A}(\ldots a\ldots)`, tex`{=}E\ m,n`)),
  ],
}

const tex = String.raw
const A = String.raw`\mathscr{A}`
const B = String.raw`\mathscr{B}`
const C = String.raw`\mathscr{C}`

const table = (rows) => tex`\begin{array}{r|l@{\qquad}l}${rows}\end{array}`
const subproof = (rows) => tex`\begin{array}{r|l@{\qquad}l}${rows}\end{array}`
const justified = (formula, justification) => tex`${formula}&${justification}`
const stack = (...examples) => tex`\begin{gathered}${examples.join(String.raw`\\[1.1em]`)}\end{gathered}`


export const FITCH_RULE_EXAMPLES = {
  '∧I': [table(tex`m&${A}\\n&${B}\\&${justified(tex`${A}\land${B}`, tex`\land I\ m,n`)}`)],
  '∧E': [stack(
    table(tex`m&${A}\land${B}\\&${justified(A, tex`\land E\ m`)}`),
    table(tex`m&${A}\land${B}\\&${justified(B, tex`\land E\ m`)}`),
  )],
  '→I': [table(tex`&${subproof(tex`m&${justified(A, tex`\mathrm{AS}`)}\\n&${B}`)}\\&${justified(tex`${A}\to${B}`, tex`\to I\ m\text{-}n`)}`)],
  '→E': [table(tex`m&${A}\to${B}\\n&${A}\\&${justified(B, tex`\to E\ m,n`)}`)],
  '↔I': [table(tex`&${subproof(tex`i&${justified(A, tex`\mathrm{AS}`)}\\j&${B}`)}\\&${subproof(tex`k&${justified(B, tex`\mathrm{AS}`)}\\l&${A}`)}\\&${justified(tex`${A}\leftrightarrow${B}`, tex`\leftrightarrow I\ i\text{-}j,k\text{-}l`)}`)],
  '↔E': [
    table(tex`m&${A}\leftrightarrow${B}\\n&${A}\\&${justified(B, tex`\leftrightarrow E\ m,n`)}`),
    table(tex`m&${A}\leftrightarrow${B}\\n&${B}\\&${justified(A, tex`\leftrightarrow E\ m,n`)}`),
  ],
  '∨I': [
    table(tex`m&${A}\\&${justified(tex`${A}\lor${B}`, tex`\lor I\ m`)}`),
    table(tex`m&${A}\\&${justified(tex`${B}\lor${A}`, tex`\lor I\ m`)}`),
  ],
  '∨E': [table(tex`m&${A}\lor${B}\\&${subproof(tex`i&${justified(A, tex`\mathrm{AS}`)}\\j&${C}`)}\\&${subproof(tex`k&${justified(B, tex`\mathrm{AS}`)}\\l&${C}`)}\\&${justified(C, tex`\lor E\ m,i\text{-}j,k\text{-}l`)}`)],
  '¬I': [table(tex`&${subproof(tex`i&${justified(A, tex`\mathrm{AS}`)}\\j&\bot`)}\\&${justified(tex`\neg${A}`, tex`\neg I\ i\text{-}j`)}`)],
  '¬E': [table(tex`m&\neg${A}\\n&${A}\\&${justified(tex`\bot`, tex`\neg E\ m,n`)}`)],
  IP: [table(tex`&${subproof(tex`i&${justified(tex`\neg${A}`, tex`\mathrm{AS}`)}\\j&\bot`)}\\&${justified(A, tex`\mathrm{IP}\ i\text{-}j`)}`)],
  X: [table(tex`m&\bot\\&${justified(A, tex`\mathrm X\ m`)}`)],
  R: [table(tex`m&${A}\\&${justified(A, tex`\mathrm R\ m`)}`)],
  DS: [
    table(tex`m&${A}\lor${B}\\n&\neg${A}\\&${justified(B, tex`\mathrm{DS}\ m,n`)}`),
    table(tex`m&${A}\lor${B}\\n&\neg${B}\\&${justified(A, tex`\mathrm{DS}\ m,n`)}`),
  ],
  MT: [table(tex`m&${A}\to${B}\\n&\neg${B}\\&${justified(tex`\neg${A}`, tex`\mathrm{MT}\ m,n`)}`)],
  DNE: [table(tex`m&\neg\neg${A}\\&${justified(A, tex`\mathrm{DNE}\ m`)}`)],
  LEM: [table(tex`&${subproof(tex`i&${justified(A, tex`\mathrm{AS}`)}\\j&${B}`)}\\&${subproof(tex`k&${justified(tex`\neg${A}`, tex`\mathrm{AS}`)}\\l&${B}`)}\\&${justified(B, tex`\mathrm{LEM}\ i\text{-}j,k\text{-}l`)}`)],
  DeM: [stack(
    table(tex`m&\neg(${A}\land${B})\\&${justified(tex`\neg${A}\lor\neg${B}`, tex`\mathrm{DeM}\ m`)}`),
    table(tex`m&\neg${A}\lor\neg${B}\\&${justified(tex`\neg(${A}\land${B})`, tex`\mathrm{DeM}\ m`)}`),
    table(tex`m&\neg(${A}\lor${B})\\&${justified(tex`\neg${A}\land\neg${B}`, tex`\mathrm{DeM}\ m`)}`),
    table(tex`m&\neg${A}\land\neg${B}\\&${justified(tex`\neg(${A}\lor${B})`, tex`\mathrm{DeM}\ m`)}`),
  )],
  '∀E': [table(tex`m&\forall x\,${A}(\ldots x\ldots)\\&${justified(tex`${A}(\ldots c\ldots)`, tex`\forall E\ m`)}`)],
  '∀I': [table(tex`m&${A}(\ldots c\ldots)\\&${justified(tex`\forall x\,${A}(\ldots x\ldots)`, tex`\forall I\ m`)}`)],
  '∃I': [table(tex`m&${A}(\ldots c\ldots)\\&${justified(tex`\exists x\,${A}(\ldots x\ldots)`, tex`\exists I\ m`)}`)],
  '∃E': [table(tex`m&\exists x\,${A}(\ldots x\ldots)\\&${subproof(tex`i&${justified(tex`${A}(\ldots c\ldots)`, tex`\mathrm{AS}`)}\\j&${B}`)}\\&${justified(B, tex`\exists E\ m,i\text{-}j`)}`)],
  CQ: [stack(
    table(tex`m&\forall x\,\neg${A}\\&${justified(tex`\neg\exists x\,${A}`, tex`\mathrm{CQ}\ m`)}`),
    table(tex`m&\neg\exists x\,${A}\\&${justified(tex`\forall x\,\neg${A}`, tex`\mathrm{CQ}\ m`)}`),
    table(tex`m&\exists x\,\neg${A}\\&${justified(tex`\neg\forall x\,${A}`, tex`\mathrm{CQ}\ m`)}`),
    table(tex`m&\neg\forall x\,${A}\\&${justified(tex`\exists x\,\neg${A}`, tex`\mathrm{CQ}\ m`)}`),
  )],
  '=I': [table(tex`&${justified(tex`c=c`, tex`{=}I`)}`)],
  '=E': [
    table(tex`m&a=b\\n&${A}(\ldots a\ldots)\\&${justified(tex`${A}(\ldots b\ldots)`, tex`{=}E\ m,n`)}`),
    table(tex`m&a=b\\n&${A}(\ldots b\ldots)\\&${justified(tex`${A}(\ldots a\ldots)`, tex`{=}E\ m,n`)}`),
  ],
}

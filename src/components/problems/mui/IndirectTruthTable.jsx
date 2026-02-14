import { useMemo, useCallback } from 'react'
import getFormulaClass from '../../../lib/logicpenguin/symbolic/formula.js'
import getSyntax from '../../../lib/logicpenguin/symbolic/libsyntax.js'
import { multiTables } from '../../../lib/logicpenguin/symbolic/libsemantics.js'
import SandboxTruthTable from './SandboxTruthTable.jsx'

export default function IndirectTruthTable(props) {
  const syntax = useMemo(() => getSyntax(), [])
  const Formula = useMemo(() => getFormulaClass(), [])

  // tokenize with classical syntax
  const tokenizeStatement = useCallback((statement) => {
    if (!statement) return []
    let tokens = []
    let rstr = '[(\\[{]*'
    rstr += `[${syntax.notation.predicatesRange}`
    for (const o in syntax.operators) { rstr += o }
    rstr += `][${syntax.notation.constantsRange}${syntax.notation.variableRange}]*`
    rstr += '[)\\]}]*'
    const regex = new RegExp(rstr, 'g')
    tokens = Array.from(statement.replace(/\s/g, '').matchAll(regex)).map(
      (match) => match[0]
    )
    if (tokens.length) return tokens
    try {
      const wff = Formula.from(statement)
      tokens = multiTables([wff])?.tables?.[0]?.tokens ?? []
      if (tokens.length) return tokens
    } catch {
      return []
    }
    return []
  }, [Formula, syntax])

  return (
    <SandboxTruthTable
      {...props}
      problemType="indirect-truth-table"
      tokenizeStatement={tokenizeStatement}
      defaultToggleValues={['T', 'F']}
    />
  )
}

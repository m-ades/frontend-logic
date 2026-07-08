import { useMemo, useCallback } from 'react'
import getFormulaClass from '../../../lib/logicpenguin/symbolic/formula.js'
import getSyntax from '../../../lib/logicpenguin/symbolic/libsyntax.js'
import { multiTables } from '../../../lib/logicpenguin/symbolic/libsemantics.js'
import SandboxTruthTable from './SandboxTruthTable.jsx'
import { tokenizeTruthTableHeader } from './truthTableUi.js'
import { getNotation } from '../../../lib/logicSystems.js'

export default function IndirectTruthTable(props) {
  const notation = getNotation(props.logicSystem)
  const syntax = useMemo(() => getSyntax(notation), [notation])
  const Formula = useMemo(() => getFormulaClass(notation), [notation])

  // tokenize with classical syntax
  const tokenizeStatement = useCallback((statement) => {
    if (!statement) return []
    let tokens = tokenizeTruthTableHeader(statement, syntax)
    if (tokens.length) return tokens
    try {
      const wff = Formula.from(statement)
      tokens = multiTables([wff], notation)?.tables?.[0]?.tokens ?? []
      if (tokens.length) return tokens
    } catch {
      return []
    }
    return []
  }, [Formula, notation, syntax])

  return (
    <SandboxTruthTable
      {...props}
      problemType="indirect-truth-table"
      tokenizeStatement={tokenizeStatement}
      defaultToggleValues={['T', 'F']}
    />
  )
}

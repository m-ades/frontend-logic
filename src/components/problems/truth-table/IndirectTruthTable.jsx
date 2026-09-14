import { useMemo, useCallback } from 'react'
import getFormulaClass from '@logic-app/logic-engine/symbolic/formula.js'
import getSyntax from '@logic-app/logic-engine/symbolic/libsyntax.js'
import { multiTables } from '@logic-app/logic-engine/symbolic/libsemantics.js'
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

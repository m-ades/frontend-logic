import { useCallback } from 'react'
import SandboxTruthTable from './SandboxTruthTable.jsx'

const LETTER_RANGE = 'A-Za-zΑ-Ωα-ω'

// normalize symbols and lowercase v
const normalizeStatement = (statement) => {
  if (!statement) return ''
  return statement
    .replace(/\s/g, '')
    .replaceAll('↔︎', '↔')
    .replace(
      new RegExp(`([${LETTER_RANGE})\\]\\}])v([${LETTER_RANGE}\\(\\[\\{])`, 'g'),
      '$1V$2'
    )
}

export default function NonClassicalTruthTable(props) {
  // tokenize with nonclassical symbols
  const tokenizeStatement = useCallback((statement) => {
    if (!statement) return []
    const normalized = normalizeStatement(statement)
    const tokenRegex = new RegExp(`[(\\[{]*[${LETTER_RANGE}~&V→↔][)\\]}]*`, 'g')
    const matches = Array.from(normalized.matchAll(tokenRegex)).map((match) => match[0])
    return matches.length ? matches : [statement]
  }, [])

  return (
    <SandboxTruthTable
      {...props}
      problemType="nonclassical-truth-table"
      tokenizeStatement={tokenizeStatement}
      toggleValues={props?.problem?.truthValueToggle}
      defaultToggleValues={['T', 'F', 'N']}
      tokenTextTransform="none"
    />
  )
}

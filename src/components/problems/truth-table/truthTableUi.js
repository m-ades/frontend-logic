/* 
Shared truth table helpers for truthtable and truthtableeditor
  creates state and submission payloads
  tokenizes headers and supports grid density 
*/  

import { shouldUseApiValidation, submitApiValidation } from '../../../utils/submissionRuntime.js'
import {
  argumentTables,
  equivTablesMany,
  formulaTable,
} from '../../../lib/logicpenguin/symbolic/libsemantics.js'
import {
  displayIndexedSymbolsForNotation,
  isPropositionalSymbol,
  normalizeIndexedSymbols,
} from '../../../lib/indexedSymbols.js'


export function buildClassificationState(selection = []) {
  return {
    mcans: selection,
    taut: selection.includes('tautology'),
    contra: selection.includes('self-contradiction'),
    valid: selection.includes('valid'),
    equiv: selection.includes('equivalent'),
    classification: {
      mcans: selection,
      taut: selection.includes('tautology'),
      contra: selection.includes('self-contradiction'),
    },
  }
}

export function buildTruthTableStatePayload(rows, selection = [], mainOperatorColumn = null) {
  return {
    tables: rows.map((tableRows) => ({ rows: tableRows })),
    mainOperatorColumn,
    ...buildClassificationState(selection),
  }
}

export function buildTruthTableSubmissionData(
  kind,
  rows,
  selection = [],
  classificationEnabled = false,
  mainOperatorColumn = null
) {
  const tableData = rows.map((tableRows) => ({
    rows: tableRows.map((row) => row.map((cell) => cell === 'T')),
    colhls: tableRows.length > 0 ? Array(tableRows[0].length).fill(false) : [],
  }))

  if (kind === 'formula') {
    if (Number.isInteger(mainOperatorColumn?.colIndex) && tableData[0]?.colhls[mainOperatorColumn.colIndex] !== undefined) {
      tableData[0].colhls[mainOperatorColumn.colIndex] = true
    }
  }

  if (tableData.length === 0) {
    return { lefts: [], right: { rows: [] }, rowhls: [] }
  }

  if (kind === 'formula') {
    return {
      lefts: [],
      right: tableData[0],
      rowhls: [],
      ...(classificationEnabled
        ? {
            mcans: selection,
            taut: selection.includes('tautology'),
            contra: selection.includes('self-contradiction'),
          }
        : {}),
    }
  }

  if (kind === 'equivalence') {
    return {
      lefts: tableData.slice(0, -1),
      right: tableData[tableData.length - 1],
      rowhls: [],
      ...(classificationEnabled
        ? {
            mcans: selection,
            equiv: selection.includes('equivalent'),
          }
        : {}),
    }
  }

  if (tableData.length > 1) {
    return {
      lefts: tableData.slice(0, -1),
      right: tableData[tableData.length - 1],
      rowhls: [],
      ...(classificationEnabled
        ? {
            mcans: selection,
            valid: selection.includes('valid'),
          }
        : {}),
    }
  }

  return { lefts: [], right: tableData[0], rowhls: [] }
}

export function normalizeSavedClassification(kind, savedState) {
  if (Array.isArray(savedState?.mcans)) {
    return savedState.mcans.map((value) => String(value))
  }
  if (kind === 'formula') {
    if (savedState?.taut) return ['tautology']
    if (savedState?.contra) return ['self-contradiction']
    if (savedState?.mcans === 1) return ['contingent']
  }
  if (kind === 'argument') {
    // older saves used numeric radio indices
    if (savedState?.valid === true || savedState?.mcans === 0) return ['valid']
    if (savedState?.valid === false || savedState?.mcans === 1) return ['invalid']
  }
  if (kind === 'equivalence') {
    // older saves used numeric radio indices
    if (savedState?.equiv === true || savedState?.mcans === 0) return ['equivalent']
  }
  return []
}

export function tokenizeTruthTableHeader(statement, syntax) {
  if (!statement) return []
  let rstr = '[(\\[{]*'
  rstr += `[${syntax.notation.predicatesRange}`
  for (const operator in syntax.operators) {
    rstr += operator
  }
  const indexedRange = syntax.notationname === 'calgary' ? '_0-9' : ''
  rstr += `][${syntax.notation.constantsRange}${syntax.notation.variableRange}${indexedRange}]*`
  rstr += '[)\\]}]*'
  const regex = new RegExp(rstr, 'g')
  const normalizedStatement = syntax.inputfix(statement).replace(/\s/g, '')
  return Array.from(normalizedStatement.matchAll(regex)).map((match) => (
    displayIndexedSymbolsForNotation(match[0], syntax.notationname)
  ))
}

// formats semantic tokens without changing verified column order
export function buildAlignedTruthTableHeader(statement, syntax, semanticTokens) {
  const tokens = Array.isArray(semanticTokens) ? semanticTokens : []
  const fallback = tokens.map((token) => (
    displayIndexedSymbolsForNotation(token, syntax.notationname)
  ))
  const displayTokens = tokenizeTruthTableHeader(statement, syntax)
  if (displayTokens.length !== tokens.length) return fallback

  const normalizeToken = (token) => syntax.symbolfix(
    normalizeIndexedSymbols(String(token ?? '').replace(/[()\[\]{}]/g, ''))
  )
  const isAligned = displayTokens.every((token, index) => (
    normalizeToken(token) === normalizeToken(tokens[index])
  ))
  return isAligned ? displayTokens : fallback
}

export function isAtomicTruthTableToken(token, operatorSet, syntax) {
  if (!token) return false
  const stripped = token.replace(/[()\[\]{}]/g, '')
  if (syntax?.notationname === 'calgary' && isPropositionalSymbol(stripped)) {
    return true
  }
  return stripped.length === 1 && !operatorSet.has(stripped)
}

// formats multiple statements as a single line for display above a truth table
export function formatTruthTableStatements(statements, notation, isArgument = false) {
  if (!Array.isArray(statements) || statements.length === 0) return ''
  const displayed = statements.map((statement) => displayIndexedSymbolsForNotation(statement, notation))
  if (isArgument && displayed.length > 1) {
    return `${displayed.slice(0, -1).join(', ')} ∴ ${displayed.at(-1)}`
  }
  return displayed.join(', ')
}

export function deriveTruthTableSolutionClassification(kind, solution, statements, Formula, notation) {
  if (kind === 'formula') {
    if (solution?.taut) return ['tautology']
    if (solution?.contra) return ['self-contradiction']
    if (solution?.mcans === 1) return ['contingent']
    if (statements.length === 0) return []
    try {
      const wff = Formula.from(statements[0])
      const { taut, contra } = formulaTable(wff, notation)
      if (taut) return ['tautology']
      if (contra) return ['self-contradiction']
      return ['contingent']
    } catch {
      return []
    }
  }

  if (kind === 'argument') {
    if (solution?.valid === true) return ['valid']
    if (solution?.valid === false) return ['invalid']
    if (statements.length < 2) return []
    try {
      const leftWffs = statements.slice(0, -1).map((statement) => Formula.from(statement))
      const rightWff = Formula.from(statements[statements.length - 1])
      const { valid } = argumentTables(leftWffs, rightWff, notation)
      return valid ? ['valid'] : ['invalid']
    } catch {
      return []
    }
  }

  if (kind === 'equivalence') {
    if (statements.length < 2) return []
    try {
      const wffs = statements.map((statement) => Formula.from(statement))
      const { equiv, tables } = equivTablesMany(wffs, notation)
      const toBool = (value) => value === true || value === 'T'
      let consistent = false
      for (let rowIndex = 0; rowIndex < tables[0].rows.length; rowIndex += 1) {
        if (tables.every((table) => toBool(table.rows[rowIndex][table.opspot]))) {
          consistent = true
          break
        }
      }
      const labels = []
      if (equiv && statements.length === 2) labels.push('equivalent')
      if (consistent) labels.push('consistent')
      if (!consistent) labels.push('inconsistent')
      return labels
    } catch {
      return []
    }
  }

  return []
}

export function normalizeTruthTableCellValue(cell) {
  if (cell === true || cell === 'T' || cell === 't' || cell === 1) return 'T'
  if (cell === false || cell === 'F' || cell === 'f' || cell === 0) return 'F'
  return cell ?? ''
}

export function normalizeTruthTableRows(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return []
  if (rows.every((row) => Array.isArray(row))) {
    return rows.map((row) => row.map((cell) => normalizeTruthTableCellValue(cell)))
  }
  return [rows.map((cell) => normalizeTruthTableCellValue(cell))]
}

export function buildDisplaySolutionTables(solution, fallbackTables = [], defaultLabel = 'Answer') {
  // keep a table shape the ui can actually use
  const normalizedFallbackTables = (fallbackTables || []).map((table) => ({
    label: table?.label || '',
    tokens: Array.isArray(table?.tokens) ? table.tokens : [],
    headerTokens: Array.isArray(table?.headerTokens) && table.headerTokens.length > 0
      ? table.headerTokens
      : (Array.isArray(table?.tokens) ? table.tokens : []),
    rows: normalizeTruthTableRows(table?.rows),
  }))

  let candidateTables = []

  if (solution?.format === 'truth-table' && Array.isArray(solution.rows)) {
    candidateTables = [{
      label: solution.label || defaultLabel,
      tokens: Array.isArray(solution.tokens) ? solution.tokens : [],
      headerTokens: Array.isArray(solution.headerTokens) && solution.headerTokens.length > 0
        ? solution.headerTokens
        : (Array.isArray(solution.tokens) ? solution.tokens : []),
      rows: normalizeTruthTableRows(solution.rows),
    }]
  } else if (solution?.format === 'truth-table-row' && Array.isArray(solution.row)) {
    candidateTables = [{
      label: solution.label || defaultLabel,
      tokens: Array.isArray(solution.tokens) ? solution.tokens : [],
      headerTokens: Array.isArray(solution.headerTokens) && solution.headerTokens.length > 0
        ? solution.headerTokens
        : (Array.isArray(solution.tokens) ? solution.tokens : []),
      rows: [solution.row.map((cell) => normalizeTruthTableCellValue(cell))],
    }]
  } else if (Array.isArray(solution?.tables)) {
    candidateTables = solution.tables.map((table) => ({
      label: table?.label || '',
      tokens: Array.isArray(table?.tokens) ? table.tokens : [],
      headerTokens: Array.isArray(table?.headerTokens) && table.headerTokens.length > 0
        ? table.headerTokens
        : (Array.isArray(table?.tokens) ? table.tokens : []),
      rows: normalizeTruthTableRows(table?.rows),
    }))
  }

  const splitCombinedCandidateToFallbackTables = (table) => {
    // some older answers store one wide table where the ui expects many
    if (normalizedFallbackTables.length <= 1) return null
    const expectedColumnCounts = normalizedFallbackTables.map((fallbackTable) => fallbackTable.tokens.length)
    const totalExpectedColumns = expectedColumnCounts.reduce((sum, count) => sum + count, 0)
    if (totalExpectedColumns === 0 || table.rows.length === 0) return null
    const rowsMatchCombinedShape = table.rows.every((row) => row.length === totalExpectedColumns)
    if (!rowsMatchCombinedShape) return null

    return normalizedFallbackTables.map((fallbackTable, tableIndex) => {
      const start = expectedColumnCounts.slice(0, tableIndex).reduce((sum, count) => sum + count, 0)
      const end = start + expectedColumnCounts[tableIndex]
      return {
        label: fallbackTable.label || table.label || '',
        tokens: fallbackTable.tokens,
        headerTokens: fallbackTable.headerTokens,
        rows: table.rows.map((row) => row.slice(start, end)),
      }
    })
  }

  const hydratedCandidateTables = candidateTables.map((table, index) => {
    const fallbackTable = normalizedFallbackTables[index]
    const tokens = table.tokens.length > 0 ? table.tokens : (fallbackTable?.tokens || [])
    const headerTokens = table.headerTokens.length > 0
      ? table.headerTokens
      : (fallbackTable?.headerTokens || tokens)
    return {
      label: table.label || fallbackTable?.label || '',
      tokens,
      headerTokens,
      rows: table.rows,
    }
  })
  const candidateTablesWithSplitSupport =
    hydratedCandidateTables.length === 1
    && normalizedFallbackTables.length > 1
      // split a combined answer before we give up and fall back
      ? (splitCombinedCandidateToFallbackTables(hydratedCandidateTables[0]) || hydratedCandidateTables)
      : hydratedCandidateTables

  const hasCompatibleShape =
    candidateTablesWithSplitSupport.length > 0 &&
    (normalizedFallbackTables.length === 0 || (
      candidateTablesWithSplitSupport.length === normalizedFallbackTables.length &&
      candidateTablesWithSplitSupport.every((table, index) => {
        const fallbackTable = normalizedFallbackTables[index]
        if (!fallbackTable) return table.rows.length > 0
        if (fallbackTable.tokens.length > 0 && table.tokens.length !== fallbackTable.tokens.length) return false
        if (fallbackTable.rows.length > 0 && table.rows.length !== fallbackTable.rows.length) return false
        return table.rows.every((row, rowIndex) => {
          const fallbackRow = fallbackTable.rows[rowIndex]
          return !fallbackRow || row.length === fallbackRow.length
        })
      })
    ))

  return hasCompatibleShape ? candidateTablesWithSplitSupport : normalizedFallbackTables
}

export async function submitTruthTableAnswer({
  assignmentQuestionId,
  submissionData,
  localIsCorrect,
  attemptLimit,
  classificationEnabled,
  selection,
}) {
  if (shouldUseApiValidation(assignmentQuestionId)) {
    const { response, validation, successstatus, rawScore } = await submitApiValidation({
      assignmentQuestionId,
      submissionData,
    })
    const success = successstatus === 'correct'
    const score = rawScore
    return {
      mode: 'remote',
      response,
      score,
      isCorrect: success,
      nextStatus: success ? 'correct' : score != null && score > 0 && score < 100 ? 'partial' : 'incorrect',
      message: success
        ? 'Correct!'
        : validation.message || validation.transmessage || (score != null && score > 0 && score < 100 ? 'Partially correct.' : 'Incorrect.'),
    }
  }

  return {
    mode: 'local',
    response: null,
    score: null,
    isCorrect: localIsCorrect,
    nextStatus: localIsCorrect ? 'correct' : 'incorrect',
    message: localIsCorrect
      ? 'Correct!'
        : classificationEnabled && selection.length === 0
          ? 'Select a classification before submitting.'
        : 'Incorrect.',
    }
  }

export function getDisplayedColumnCount(tables = [], combined) {
  if (!Array.isArray(tables) || tables.length === 0) return 0
  if (!combined) {
    return tables.reduce((max, table) => {
      const headerTokens = table?.headerTokens && table.headerTokens.length > 0 ? table.headerTokens : table?.tokens ?? []
      return Math.max(max, headerTokens.length)
    }, 0)
  }
  return tables.reduce((count, table, tableIndex) => {
    const headerTokens = table?.headerTokens && table.headerTokens.length > 0 ? table.headerTokens : table?.tokens ?? []
    return count + headerTokens.length + (tableIndex > 0 ? 1 : 0)
  }, 0)
}

// keep wide tables readable without measuring the dom
export function getTruthTableDensity(columnCount) {
  if (columnCount >= 11) {
    return { cell: 56, cellMax: 60, separator: 28, selectorLane: 36 }
  }
  if (columnCount >= 8) {
    return { cell: 64, cellMax: 68, separator: 32, selectorLane: 36 }
  }
  return { cell: 76, cellMax: 80, separator: 36, selectorLane: 36 }
}

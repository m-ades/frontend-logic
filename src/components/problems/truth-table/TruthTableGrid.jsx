import * as React from 'react'
import {
  Box,
  ButtonBase,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Tooltip,
  alpha,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { getDisplayedColumnCount, getTruthTableDensity } from './truthTableUi.js'
import { TruthTableSelectorButton, TruthValueButton } from './TruthTableControls.jsx'

// a header cell click cycles through none -> highlighted -> main operator (graded) highlight

function TokenHeaderButton({ token, ariaLabel, isHighlighted, isMainOperator, mainOperatorMode, onToggleHighlight, onMarkMainOperator, onClearMainOperator }) {
  const handleClick = () => {
    if (!mainOperatorMode) {
      onToggleHighlight()
      return
    }
    if (isMainOperator) {
      onClearMainOperator?.()
      return
    }
    if (isHighlighted) {
      onToggleHighlight()
      onMarkMainOperator()
      return
    }
    onToggleHighlight()
  }

  return (
    <Tooltip title="highlight column">
      <ButtonBase
        aria-label={ariaLabel}
        aria-pressed={isHighlighted || isMainOperator}
        onClick={handleClick}
        sx={{ position: 'absolute', inset: 0, font: 'inherit', color: 'inherit' }}
      >
        {token}
      </ButtonBase>
    </Tooltip>
  )
}

// renders one or more truth tables in a shared grid
// show hurley separators adds slash columns and marks the final table as the conclusion
export default function TruthTableGrid({
  tables,
  tableInputs,
  combined,
  readOnly,
  onCellChange,
  showHurleySeparators = false,
  withSelectors = true,
  allowRowSelection = withSelectors,
  selectedColumns = [],
  selectedRows = [],
  onToggleColumn,
  onToggleRow,
  mainOperatorColumn,
  onSelectMainOperator,
  onClearMainOperator,
  witnessRow,
  onSelectWitnessRow,
  onClearWitnessRow,
  toggleValues,
  shrinkWrap = false,
  renderCell,
  isCellReadOnly,
  showLabels = true,
}) {
  const theme = useTheme()
  const cellBorderColor = theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'var(--lpgray6)'
  const statementDividerColor = theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.36)' : 'rgba(0, 0, 0, 0.34)'
  const cornerBg = theme.palette.mode === 'dark' ? '#23232D' : '#fff'
  const headerBg = theme.palette.mode === 'dark'
    ? alpha(theme.palette.primary.light, 0.16)
    : alpha(theme.palette.primary.main, 0.08)
  const stripeBg = theme.palette.mode === 'dark'
    ? alpha(theme.palette.common.white, 0.04)
    : alpha(theme.palette.common.black, 0.028)
  const highlightStyle = { backgroundColor: alpha(theme.palette.primary.main, 0.14) }
  const mainOperatorMode = typeof onSelectMainOperator === 'function'
  const mainOpBorderWidth = 3

  const mainOpBorderStyle = ({ top = false, bottom = false } = {}) => ({
    borderLeft: `${mainOpBorderWidth}px solid ${theme.palette.primary.main}`,
    borderRight: `${mainOpBorderWidth}px solid ${theme.palette.primary.main}`,
    ...(top ? { borderTop: `${mainOpBorderWidth}px solid ${theme.palette.primary.main}` } : {}),
    ...(bottom ? { borderBottom: `${mainOpBorderWidth}px solid ${theme.palette.primary.main}` } : {}),
  })
  // the row equivalent of mainOpBorderStyle: a horizontal box around the
  // confirmed witness row instead of a vertical one around the main
  // operator column
  const witnessRowBorderStyle = ({ left = false, right = false } = {}) => ({
    borderTop: `${mainOpBorderWidth}px solid ${theme.palette.primary.main}`,
    borderBottom: `${mainOpBorderWidth}px solid ${theme.palette.primary.main}`,
    ...(left ? { borderLeft: `${mainOpBorderWidth}px solid ${theme.palette.primary.main}` } : {}),
    ...(right ? { borderRight: `${mainOpBorderWidth}px solid ${theme.palette.primary.main}` } : {}),
  })
  const cellBorderStyle = (mainOpStyle, witnessStyle) => {
    if (!mainOpStyle && !witnessStyle) return undefined
    return { ...mainOpStyle, ...witnessStyle }
  }
  const isMainOperatorColumn = (tableIndex, colIndex) => (
    mainOperatorMode
    && mainOperatorColumn?.tableIndex === tableIndex
    && mainOperatorColumn?.colIndex === colIndex
  )
  const tableDensity = React.useMemo(() => {
    const columnCount = getDisplayedColumnCount(tables, combined)
    return getTruthTableDensity(columnCount)
  }, [combined, tables])

  const compactTableSx = { width: 'auto', tableLayout: 'fixed' }
  const compactCellSx = {
    position: 'relative',
    height: 40,
    px: 0,
    py: 0,
    width: tableDensity.cell,
    minWidth: tableDensity.cell,
    maxWidth: tableDensity.cellMax,
    boxSizing: 'border-box',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
  }
  const compactHeaderCellSx = {
    ...compactCellSx,
    fontSize: '1.125rem',
    fontWeight: 600,
  }
  const separatorCellSx = {
    width: tableDensity.separator,
    minWidth: tableDensity.separator,
    maxWidth: tableDensity.separator,
    px: 0,
  }
  const selectorLaneSx = {
    width: tableDensity.selectorLane,
    minWidth: tableDensity.selectorLane,
    backgroundColor: cornerBg,
  }

  const tableContainerSx = {
    background: 'transparent',
    boxShadow: 'none',
    '&.MuiPaper-root': {
      boxShadow: 'none',
    },
    '& .MuiTable-root': {
      background: 'transparent',
      border: 'none',
      boxShadow: 'none',
    },
    '& .MuiTableCell-root': {
      color: 'text.primary',
      border: `1px solid ${cellBorderColor}`,
    },
    '& .MuiTableCell-root.tt-statement-start': {
      borderLeft: `2px solid ${statementDividerColor}`,
    },
    '& .MuiTableHead-root .MuiTableCell-root:not(.tt-selector-corner)': {
      backgroundColor: headerBg,
    },
    '& .MuiTableHead-root .MuiTableCell-root[data-tt-highlight="true"]': highlightStyle,
    '& .MuiTableRow-root:nth-of-type(even)': {
      backgroundColor: stripeBg,
    },
    '& .tt-row-selector-cell, & .tt-selector-corner, & .tt-selector-corner-bottom': {
      border: 'none',
      borderBottom: 'none',
    },
    '& .tt-row-selector-cell': {
      backgroundColor: cornerBg,
    },
    '& .MuiTableHead-root .MuiTableCell-root.tt-selector-corner, & .tt-selector-corner-bottom': {
      backgroundColor: cornerBg,
    },
  }

  const renderSelector = (selected, onClick, ariaLabel, tooltip, label) => (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <TruthTableSelectorButton selected={selected} onClick={onClick} ariaLabel={ariaLabel} tooltip={tooltip} label={label} />
    </Box>
  )
  // a row selector click cycles through none -> highlighted -> witness (graded)
  // highlight, the same duality the column header buttons use for the main
  // operator: a single tap is the plain visual highlight every problem type
  // already has, tapping the already-highlighted row again marks it as the
  // single graded witness row
  const witnessRowMode = typeof onSelectWitnessRow === 'function'
  const isRowSelected = (rowIndex) => witnessRow === rowIndex || selectedRows.includes(rowIndex)
  const handleRowSelectorClick = (rowIndex) => {
    if (!witnessRowMode) {
      onToggleRow?.(rowIndex)
      return
    }
    if (witnessRow === rowIndex) {
      onClearWitnessRow?.()
      return
    }
    if (selectedRows.includes(rowIndex)) {
      onToggleRow?.(rowIndex)
      onSelectWitnessRow?.(rowIndex)
      return
    }
    onToggleRow?.(rowIndex)
  }
  const renderRowSelectorCell = (rowIndex) => renderSelector(
    isRowSelected(rowIndex),
    () => handleRowSelectorClick(rowIndex),
    `Highlight row ${rowIndex + 1}`,
    'highlight row',
    rowIndex + 1
  )
  const renderHeaderToken = (token, selected, isMainOp, tableIndex, colIndex, ariaLabel) => (
    withSelectors ? (
      <TokenHeaderButton
        token={token}
        isHighlighted={selected}
        isMainOperator={isMainOp}
        ariaLabel={ariaLabel}
        onToggleHighlight={() => onToggleColumn?.(tableIndex, colIndex)}
        mainOperatorMode={mainOperatorMode}
        onMarkMainOperator={() => onSelectMainOperator?.(tableIndex, colIndex)}
        onClearMainOperator={onClearMainOperator}
      />
    ) : token
  )
  const getCellAriaLabel = (table, rowIndex, colIndex) => {
    const headerTokens = table?.headerTokens && table.headerTokens.length > 0 ? table.headerTokens : table?.tokens ?? []
    const token = headerTokens[colIndex] || table?.tokens?.[colIndex] || `column ${colIndex + 1}`
    const tableLabel = table?.label ? `${table.label} ` : ''
    return `${tableLabel}row ${rowIndex + 1} token ${token}`
  }

  if (combined) {
    const rowCount = tables.reduce((max, table) => Math.max(max, table?.rows?.length ?? 0), 0)
    return (
      <TableContainer
        component={Paper}
        className="tt-table-wrap"
        elevation={0}
        sx={shrinkWrap ? { ...tableContainerSx, width: 'max-content' } : tableContainerSx}
      >
        <Table className="tt-table" sx={compactTableSx}>
          <TableHead className="tt-head">
            <TableRow className="tt-token-row">
              {tables.map((table, tableIndex) => {
                const isConclusion = showHurleySeparators && tableIndex === tables.length - 1 && tables.length > 1
                const headerTokens = table.headerTokens && table.headerTokens.length > 0 ? table.headerTokens : table.tokens
                return (
                  <React.Fragment key={`combined-tokenfrag-${tableIndex}`}>
                    {showHurleySeparators && tableIndex > 0 && (
                      <TableCell className="tt-token tt-separator" align="center" sx={{ ...separatorCellSx, background: 'transparent', color: 'text.secondary' }}>
                        {isConclusion ? '//' : '/'}
                      </TableCell>
                    )}
                    {headerTokens.map((token, tokenIndex) => {
                      const selected = selectedColumns.some((col) => col.tableIndex === tableIndex && col.colIndex === tokenIndex)
                      const isMainOp = isMainOperatorColumn(tableIndex, tokenIndex)
                      return (
                        <TableCell
                          key={`combined-header-${tableIndex}-${tokenIndex}`}
                          className={[
                            'tt-token',
                            isConclusion && tokenIndex === 0 ? 'tt-conclusion' : '',
                            !showHurleySeparators && tableIndex > 0 && tokenIndex === 0 ? 'tt-statement-start' : '',
                          ].filter(Boolean).join(' ')}
                          align="center"
                          data-tt-highlight={selected && !isMainOp ? 'true' : undefined}
                          sx={isMainOp ? { ...compactHeaderCellSx, ...highlightStyle } : compactHeaderCellSx}
                          style={isMainOp ? mainOpBorderStyle({ top: true, bottom: rowCount === 0 }) : undefined}
                        >
                          {renderHeaderToken(
                            token,
                            selected,
                            isMainOp,
                            tableIndex,
                            tokenIndex,
                            `Highlight column ${tokenIndex + 1} token ${token}`
                          )}
                        </TableCell>
                      )
                    })}
                  </React.Fragment>
                )
              })}
              {allowRowSelection && (
                <TableCell aria-label="Row highlight controls" className="tt-selector-corner" align="center" sx={{ ...selectorLaneSx, p: 0, color: 'text.secondary', fontSize: '0.75rem' }}>
                  #
                </TableCell>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {Array.from({ length: rowCount }, (_, rowIndex) => {
              const isWitnessRowActive = withSelectors && allowRowSelection
                && witnessRowMode && witnessRow === rowIndex
              return (
              <TableRow key={`combined-row-${rowIndex}`} className="tt-row">
                {tables.map((table, tableIndex) => {
                  const isConclusion = showHurleySeparators && tableIndex === tables.length - 1 && tables.length > 1
                  const row = table.rows[rowIndex] ?? []
                  const headerTokens = table.headerTokens && table.headerTokens.length > 0 ? table.headerTokens : table.tokens
                  return (
                    <React.Fragment key={`combined-rowfrag-${tableIndex}`}>
                      {showHurleySeparators && tableIndex > 0 && (
                        <TableCell
                          className="tt-cell tt-separator-cell"
                          align="center"
                          sx={{ ...separatorCellSx, background: 'transparent' }}
                          style={isWitnessRowActive ? witnessRowBorderStyle() : undefined}
                        />
                      )}
                      {headerTokens.map((_, colIndex) => {
                        const colMatch = selectedColumns.some((col) => col.tableIndex === tableIndex && col.colIndex === colIndex)
                        const rowMatch = isRowSelected(rowIndex)
                        const isMainOp = isMainOperatorColumn(tableIndex, colIndex)
                        const isFirstCellInRow = tableIndex === 0 && colIndex === 0
                        const isLastCellInRow = tableIndex === tables.length - 1 && colIndex === headerTokens.length - 1
                        const cellValue = tableInputs[tableIndex]?.[rowIndex]?.[colIndex]
                        const cellReadOnly = readOnly || Boolean(isCellReadOnly?.({
                          table,
                          tableIndex,
                          rowIndex,
                          colIndex,
                          cellValue,
                        }))
                        if (renderCell) {
                          return renderCell({
                            tableIndex,
                            rowIndex,
                            colIndex,
                            cellValue,
                            isHighlighted: withSelectors && (isMainOp || colMatch || (allowRowSelection && rowMatch)),
                            cellSx: compactCellSx,
                          })
                        }
                        return (
                          <TableCell
                            key={`combined-cell-${tableIndex}-${rowIndex}-${colIndex}`}
                            className={[
                              'tt-cell',
                              isConclusion && colIndex === 0 ? 'tt-conclusion-cell' : '',
                              !showHurleySeparators && tableIndex > 0 && colIndex === 0 ? 'tt-statement-start' : '',
                            ].filter(Boolean).join(' ')}
                            align="center"
                            data-tt-highlight={withSelectors && !isMainOp && (colMatch || (allowRowSelection && rowMatch)) ? 'true' : undefined}
                            sx={
                              withSelectors && isMainOp
                                ? { ...compactCellSx, ...highlightStyle }
                                : withSelectors && (colMatch || (allowRowSelection && rowMatch))
                                  ? { ...compactCellSx, ...highlightStyle }
                                  : compactCellSx
                            }
                            style={cellBorderStyle(
                              withSelectors && isMainOp ? mainOpBorderStyle({ bottom: rowIndex === rowCount - 1 }) : undefined,
                              isWitnessRowActive ? witnessRowBorderStyle({ left: isFirstCellInRow, right: isLastCellInRow }) : undefined
                            )}
                          >
                            <TruthValueButton
                              value={cellValue}
                              onChange={(token) => onCellChange?.(tableIndex, rowIndex, colIndex, token)}
                              ariaLabel={getCellAriaLabel(table, rowIndex, colIndex)}
                              accent={false}
                              readOnly={cellReadOnly}
                              toggleValues={toggleValues}
                            />
                          </TableCell>
                        )
                      })}
                    </React.Fragment>
                  )
                })}
                {allowRowSelection && (
                  <TableCell className="tt-row-selector-cell" align="center" sx={{ ...selectorLaneSx, pl: 0.75, pr: 0, pt: 0.25, pb: 0.25, verticalAlign: 'middle' }}>
                    {renderRowSelectorCell(rowIndex)}
                  </TableCell>
                )}
              </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </TableContainer>
    )
  }

  return (
    <>
      {tables.map((table, tableIndex) => {
        const headerTokens = table.headerTokens && table.headerTokens.length > 0 ? table.headerTokens : table.tokens
        return (
          <TableContainer
            component={Paper}
            key={`table-${tableIndex}`}
            className="tt-table-wrap"
            elevation={0}
            sx={shrinkWrap ? { ...tableContainerSx, width: 'max-content' } : tableContainerSx}
          >
            {table.label && showLabels && (
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                {table.label}
              </Typography>
            )}
            <Table className="tt-table" sx={compactTableSx}>
              <TableHead className="tt-head">
                <TableRow className="tt-token-row">
                  {headerTokens.map((token, tokenIndex) => {
                    const selected = selectedColumns.some((col) => col.tableIndex === tableIndex && col.colIndex === tokenIndex)
                    const isMainOp = isMainOperatorColumn(tableIndex, tokenIndex)
                    return (
                      <TableCell
                        key={`header-${tableIndex}-${tokenIndex}`}
                        className="tt-token"
                        align="center"
                        data-tt-highlight={selected && !isMainOp ? 'true' : undefined}
                        sx={isMainOp ? { ...compactHeaderCellSx, ...highlightStyle } : compactHeaderCellSx}
                        style={isMainOp ? mainOpBorderStyle({ top: true, bottom: table.rows.length === 0 }) : undefined}
                      >
                        {renderHeaderToken(
                          token,
                          selected,
                          isMainOp,
                          tableIndex,
                          tokenIndex,
                          `Highlight column ${tokenIndex + 1} token ${token}`
                        )}
                      </TableCell>
                    )
                  })}
                  {allowRowSelection && (
                    <TableCell aria-label="Row highlight controls" className="tt-selector-corner" align="center" sx={{ ...selectorLaneSx, p: 0, color: 'text.secondary', fontSize: '0.75rem' }}>
                      #
                    </TableCell>
                  )}
                </TableRow>
              </TableHead>
              <TableBody>
                {table.rows.map((row, rowIndex) => {
                  const isWitnessRowActive = withSelectors && allowRowSelection
                    && witnessRowMode && witnessRow === rowIndex
                  return (
                  <TableRow key={`row-${tableIndex}-${rowIndex}`} className="tt-row">
                    {row.map((_, colIndex) => {
                      const colMatch = selectedColumns.some((col) => col.tableIndex === tableIndex && col.colIndex === colIndex)
                      const rowMatch = isRowSelected(rowIndex)
                      const isMainOp = isMainOperatorColumn(tableIndex, colIndex)
                      const isFirstCellInRow = colIndex === 0
                      const isLastCellInRow = colIndex === row.length - 1
                      const cellValue = tableInputs[tableIndex]?.[rowIndex]?.[colIndex]
                      const cellReadOnly = readOnly || Boolean(isCellReadOnly?.({
                        table,
                        tableIndex,
                        rowIndex,
                        colIndex,
                        cellValue,
                      }))
                      if (renderCell) {
                        return renderCell({
                          tableIndex,
                          rowIndex,
                          colIndex,
                          cellValue,
                          isHighlighted: withSelectors && (isMainOp || colMatch || (allowRowSelection && rowMatch)),
                          cellSx: compactCellSx,
                        })
                      }
                      return (
                        <TableCell
                          key={`cell-${tableIndex}-${rowIndex}-${colIndex}`}
                          className="tt-cell"
                          align="center"
                          data-tt-highlight={withSelectors && !isMainOp && (colMatch || (allowRowSelection && rowMatch)) ? 'true' : undefined}
                          sx={
                            withSelectors && isMainOp
                              ? { ...compactCellSx, ...highlightStyle }
                              : withSelectors && (colMatch || (allowRowSelection && rowMatch))
                                ? { ...compactCellSx, ...highlightStyle }
                                : compactCellSx
                          }
                          style={cellBorderStyle(
                            withSelectors && isMainOp ? mainOpBorderStyle({ bottom: rowIndex === table.rows.length - 1 }) : undefined,
                            isWitnessRowActive ? witnessRowBorderStyle({ left: isFirstCellInRow, right: isLastCellInRow }) : undefined
                          )}
                        >
                          <TruthValueButton
                            value={cellValue}
                            onChange={(token) => onCellChange?.(tableIndex, rowIndex, colIndex, token)}
                            ariaLabel={getCellAriaLabel(table, rowIndex, colIndex)}
                            accent={false}
                            readOnly={cellReadOnly}
                            toggleValues={toggleValues}
                          />
                        </TableCell>
                      )
                    })}
                    {allowRowSelection && (
                      <TableCell className="tt-row-selector-cell" align="center" sx={{ ...selectorLaneSx, pl: 0.75, pr: 0, pt: 0.25, pb: 0.25, verticalAlign: 'middle', border: 'none' }}>
                        {renderRowSelectorCell(rowIndex)}
                      </TableCell>
                    )}
                  </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )
      })}
    </>
  )
}

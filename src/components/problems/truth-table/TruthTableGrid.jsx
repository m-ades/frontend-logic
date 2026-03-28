import * as React from 'react'
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  alpha,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { getDisplayedColumnCount, getTruthTableDensity } from './truthTableUi.js'
import { TruthTableSelectorButton, TruthValueButton } from './TruthTableControls.jsx'

export default function TruthTableGrid({
  tables,
  tableInputs,
  combined,
  readOnly,
  onCellChange,
  showConclusionMarker,
  withSelectors = true,
  selectedColumns = [],
  selectedRows = [],
  onToggleColumn,
  onToggleRow,
  toggleValues,
  shrinkWrap = false,
  renderCell,
  isCellReadOnly,
}) {
  const theme = useTheme()
  const cellBorderColor = theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'var(--lpgray6)'
  const cornerBg = theme.palette.mode === 'dark' ? '#23232D' : '#fff'
  const headerBg = theme.palette.mode === 'dark'
    ? alpha(theme.palette.primary.light, 0.16)
    : alpha(theme.palette.primary.main, 0.08)
  const stripeBg = theme.palette.mode === 'dark'
    ? alpha(theme.palette.common.white, 0.04)
    : alpha(theme.palette.common.black, 0.028)
  const highlightStyle = { backgroundColor: alpha(theme.palette.primary.main, 0.14) }
  const tableDensity = React.useMemo(() => {
    const columnCount = getDisplayedColumnCount(tables, combined)
    return getTruthTableDensity(columnCount)
  }, [combined, tables])

  const compactTableSx = { width: 'auto', tableLayout: 'fixed' }
  const compactCellSx = {
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
    '& .MuiTableHead-root .MuiTableCell-root:not(.tt-selector-corner)': {
      backgroundColor: headerBg,
    },
    '& .MuiTableRow-root:nth-of-type(even)': {
      backgroundColor: stripeBg,
    },
    '& .tt-row-selector-cell, & .tt-selector-corner, & .tt-selector-corner-bottom': {
      border: 'none',
      borderBottom: 'none',
    },
    '& .tt-selector-row .MuiTableCell-root': {
      border: 'none',
      borderBottom: 'none',
      backgroundColor: cornerBg,
      pt: 0.75,
      pb: 0,
      verticalAlign: 'top',
    },
    '& .tt-row-selector-cell': {
      backgroundColor: cornerBg,
    },
    '& .MuiTableHead-root .MuiTableCell-root.tt-selector-corner, & .tt-selector-corner-bottom': {
      backgroundColor: cornerBg,
    },
  }

  const renderSelector = (selected, onClick, ariaLabel, tooltip) => (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <TruthTableSelectorButton selected={selected} onClick={onClick} ariaLabel={ariaLabel} tooltip={tooltip} />
    </Box>
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
                const isConclusion = showConclusionMarker && tableIndex === tables.length - 1 && tables.length > 1
                const headerTokens = table.headerTokens && table.headerTokens.length > 0 ? table.headerTokens : table.tokens
                return (
                  <React.Fragment key={`combined-tokenfrag-${tableIndex}`}>
                    {tableIndex > 0 && (
                      <TableCell className="tt-token tt-separator" align="center" sx={{ ...separatorCellSx, background: 'transparent', color: 'text.secondary' }}>
                        {isConclusion ? '//' : '/'}
                      </TableCell>
                    )}
                    {headerTokens.map((token, tokenIndex) => (
                      <TableCell
                        key={`combined-header-${tableIndex}-${tokenIndex}`}
                        className={isConclusion && tokenIndex === 0 ? 'tt-token tt-conclusion' : 'tt-token'}
                        align="center"
                        sx={compactHeaderCellSx}
                      >
                        {token}
                      </TableCell>
                    ))}
                  </React.Fragment>
                )
              })}
              {withSelectors && <TableCell className="tt-selector-corner" align="center" sx={{ ...selectorLaneSx, p: 0 }} />}
            </TableRow>
          </TableHead>
          <TableBody>
            {Array.from({ length: rowCount }, (_, rowIndex) => (
              <TableRow key={`combined-row-${rowIndex}`} className="tt-row">
                {tables.map((table, tableIndex) => {
                  const isConclusion = showConclusionMarker && tableIndex === tables.length - 1 && tables.length > 1
                  const row = table.rows[rowIndex] ?? []
                  const headerTokens = table.headerTokens && table.headerTokens.length > 0 ? table.headerTokens : table.tokens
                  return (
                    <React.Fragment key={`combined-rowfrag-${tableIndex}`}>
                      {tableIndex > 0 && (
                        <TableCell className="tt-cell tt-separator-cell" align="center" sx={{ ...separatorCellSx, background: 'transparent' }} />
                      )}
                      {headerTokens.map((_, colIndex) => {
                        const colMatch = selectedColumns.some((col) => col.tableIndex === tableIndex && col.colIndex === colIndex)
                        const rowMatch = selectedRows.includes(rowIndex)
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
                            isHighlighted: withSelectors && (colMatch || rowMatch),
                            cellSx: compactCellSx,
                          })
                        }
                        return (
                          <TableCell
                            key={`combined-cell-${tableIndex}-${rowIndex}-${colIndex}`}
                            className={isConclusion && colIndex === 0 ? 'tt-cell tt-conclusion-cell' : 'tt-cell'}
                            align="center"
                            data-tt-highlight={withSelectors && (colMatch || rowMatch) ? 'true' : undefined}
                            sx={withSelectors && (colMatch || rowMatch) ? { ...compactCellSx, ...highlightStyle } : compactCellSx}
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
                {withSelectors && (
                  <TableCell className="tt-row-selector-cell" align="center" sx={{ ...selectorLaneSx, pl: 0.75, pr: 0, pt: 0.25, pb: 0.25, verticalAlign: 'middle' }}>
                    {renderSelector(selectedRows.includes(rowIndex), () => onToggleRow?.(rowIndex), `Select row ${rowIndex + 1}`, 'highlight row')}
                  </TableCell>
                )}
              </TableRow>
            ))}
            {withSelectors && (
              <TableRow className="tt-selector-row">
                {tables.map((table, tableIndex) => {
                  const headerTokens = table.headerTokens && table.headerTokens.length > 0 ? table.headerTokens : table.tokens
                  return (
                    <React.Fragment key={`combined-colsel-frag-${tableIndex}`}>
                      {tableIndex > 0 && <TableCell sx={{ ...selectorLaneSx, p: 0, pt: 0.75, pb: 0, border: 'none' }} />}
                      {headerTokens.map((_, colIndex) => (
                        <TableCell key={`combined-colsel-${tableIndex}-${colIndex}`} align="center" sx={{ ...selectorLaneSx, p: 0.25, pt: 0.75, pb: 0, border: 'none' }}>
                          {renderSelector(
                            selectedColumns.some((col) => col.tableIndex === tableIndex && col.colIndex === colIndex),
                            () => onToggleColumn?.(tableIndex, colIndex),
                            `Select column ${colIndex + 1}`,
                            'highlight column'
                          )}
                        </TableCell>
                      ))}
                    </React.Fragment>
                  )
                })}
                <TableCell className="tt-selector-corner-bottom" sx={{ ...selectorLaneSx, p: 0, border: 'none' }} />
              </TableRow>
            )}
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
            {table.label && (
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                {table.label}
              </Typography>
            )}
            <Table className="tt-table" sx={compactTableSx}>
              <TableHead className="tt-head">
                <TableRow className="tt-token-row">
                  {headerTokens.map((token, tokenIndex) => (
                    <TableCell key={`header-${tableIndex}-${tokenIndex}`} className="tt-token" align="center" sx={compactHeaderCellSx}>
                      {token}
                    </TableCell>
                  ))}
                  {withSelectors && <TableCell className="tt-selector-corner" align="center" sx={{ ...selectorLaneSx, p: 0 }} />}
                </TableRow>
              </TableHead>
              <TableBody>
                {table.rows.map((row, rowIndex) => (
                  <TableRow key={`row-${tableIndex}-${rowIndex}`} className="tt-row">
                    {row.map((_, colIndex) => {
                      const colMatch = selectedColumns.some((col) => col.tableIndex === tableIndex && col.colIndex === colIndex)
                      const rowMatch = selectedRows.includes(rowIndex)
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
                          isHighlighted: withSelectors && (colMatch || rowMatch),
                          cellSx: compactCellSx,
                        })
                      }
                      return (
                        <TableCell
                          key={`cell-${tableIndex}-${rowIndex}-${colIndex}`}
                          className="tt-cell"
                          align="center"
                          data-tt-highlight={withSelectors && (colMatch || rowMatch) ? 'true' : undefined}
                          sx={withSelectors && (colMatch || rowMatch) ? { ...compactCellSx, ...highlightStyle } : compactCellSx}
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
                    {withSelectors && (
                      <TableCell className="tt-row-selector-cell" align="center" sx={{ ...selectorLaneSx, pl: 0.75, pr: 0, pt: 0.25, pb: 0.25, verticalAlign: 'middle', border: 'none' }}>
                        {renderSelector(selectedRows.includes(rowIndex), () => onToggleRow?.(rowIndex), `Select row ${rowIndex + 1}`, 'highlight row')}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                {withSelectors && (
                  <TableRow className="tt-selector-row">
                    {headerTokens.map((_, colIndex) => (
                      <TableCell key={`colsel-${tableIndex}-${colIndex}`} align="center" sx={{ ...selectorLaneSx, p: 0.25, pt: 0.75, pb: 0, border: 'none' }}>
                        {renderSelector(
                          selectedColumns.some((col) => col.tableIndex === tableIndex && col.colIndex === colIndex),
                          () => onToggleColumn?.(tableIndex, colIndex),
                          `Select column ${colIndex + 1}`,
                          'highlight column'
                        )}
                      </TableCell>
                    ))}
                    <TableCell className="tt-selector-corner-bottom" sx={{ ...selectorLaneSx, p: 0, border: 'none' }} />
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )
      })}
    </>
  )
}

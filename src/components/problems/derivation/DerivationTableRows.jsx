import {
  Box,
  FormControl,
  IconButton,
  MenuItem,
  Select,
  Stack,
  TableCell,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelIcon from '@mui/icons-material/Cancel'
import RemoveIcon from '@mui/icons-material/Remove'
import { alpha } from '@mui/material/styles'
import { getInsertSymbolLabel } from '../../ui/logicpenguin/LogicSymbol.jsx'
import MobileLogicInput from '../../ui/LogicKeyboard/MobileLogicInput.jsx'
import {
  applyLinesToJustification,
  applyRuleToJustification,
  ASSUMPTION_INDENT_PX,
  ASSUMPTION_RULES,
  formatJustificationDisplay,
  formatJustificationLines,
  getInputUnderlineSx,
  getRuleFromJustification,
  getSelectUnderlineSx,
  INDENT_PX,
  plainIconButtonSx,
} from './derivationUtils.js'

export default function DerivationTableRows({
  activeFormulaIndex,
  allowedRules,
  autoCheckEnabled,
  autoCheckState,
  canOpenFullScreen,
  commitLines,
  deleteLine,
  derivationKeyboardConfig,
  formulaRefs,
  getStoredSelection,
  handleFormulaKeyDown,
  handleInputRequestFullScreen,
  handleJustKeyDown,
  handleLineChange,
  handleLineCommit,
  handleRowNumberClick,
  handleSymbolInsert,
  indentLevels,
  initialFocusField,
  inputUnderlineSx,
  isFullScreen,
  isMobile,
  isPhone,
  justRefs,
  lineDrafts,
  lines,
  normalizeFormulaForCheck,
  pendingFocusRef,
  plainNumberCellSx,
  proof,
  premises,
  selectUnderlineSx,
  setActiveFormulaIndex,
  setLineDrafts,
  updateCursorPosition,
  useRuleDropdown,
}) {
  return (
    <>
      {premises.length === 0 && proof?.conclusion && (
        <TableRow
          key="conclusion-row"
          sx={{
            '& td': {
              py: isMobile ? 0.25 : 0.5,
              position: 'relative',
              verticalAlign: 'middle',
            },
          }}
        >
          <TableCell sx={plainNumberCellSx}>
            <Typography sx={{ color: 'transparent' }}>—</Typography>
          </TableCell>
          <TableCell sx={{ borderBottom: 'none', pl: isFullScreen ? 1 : undefined, pr: 0.5, verticalAlign: 'middle', ...(isFullScreen ? { width: '50%', minWidth: 0 } : { width: 'auto', whiteSpace: 'nowrap' }) }}>
            <Typography sx={{ color: 'transparent' }}>—</Typography>
          </TableCell>
          <TableCell sx={{ borderBottom: 'none', pl: 0.5, verticalAlign: 'middle', ...(isFullScreen ? { width: '50%', minWidth: 0 } : { width: 'auto', whiteSpace: 'nowrap' }) }}>
            <Box
              component="span"
              sx={{ fontSize: 16, color: 'text.primary', '& .clickable-char': { cursor: 'pointer', borderRadius: 1, '&:hover': { backgroundColor: (theme) => alpha(theme.palette.primary.main, theme.palette.action.hoverOpacity) } } }}
            >
              {(`// ${proof.conclusion || ''}`).split('').map((char, i) => {
                const isLetter = /^[a-zA-Z]$/.test(char)
                return isLetter ? (
                  <Box component="span" key={`conc-${i}`} className="clickable-char" onPointerDown={(e) => e.preventDefault()} onClick={() => handleSymbolInsert({ insert: char })} aria-label={getInsertSymbolLabel({ insert: char })}>
                    {char}
                  </Box>
                ) : (
                  <Box component="span" key={`conc-${i}`}>{char}</Box>
                )
              })}
            </Box>
          </TableCell>
        </TableRow>
      )}
      {lines.map((line, idx) => {
        const isActiveLine = activeFormulaIndex === idx
        const indentPx = (indentLevels[idx] || 0) * INDENT_PX
          + (indentLevels[idx] ? ASSUMPTION_INDENT_PX : 0)
        return (
          <TableRow
            key={`line-${idx}`}
            sx={{
              transform: indentPx ? `translateX(${indentPx}px)` : 'none',
              transition: 'transform 120ms ease',
              '& td': {
                py: isMobile ? 0.25 : 0.5,
                position: 'relative',
                verticalAlign: 'middle',
                transition: 'background-color 160ms ease',
              },
              ...(isActiveLine && {
                '& td': {
                  backgroundColor: (theme) => alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.12 : 0.06),
                },
                '& td:first-of-type': {
                  borderTopLeftRadius: 10,
                  borderBottomLeftRadius: 10,
                  clipPath: 'polygon(0 0, 100% 0, 100% 100%, 10px 100%, 0 50%)',
                },
                '& td:last-of-type': {
                  borderTopRightRadius: 10,
                  borderBottomRightRadius: 10,
                  clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 50%, calc(100% - 10px) 100%, 0 100%)',
                },
              }),
            }}
          >
            <TableCell sx={{ ...plainNumberCellSx, color: (theme) => alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.78 : 0.7), fontWeight: 600 }}>
              <Box
                component="button"
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  handleRowNumberClick(idx + 1)
                }}
                sx={{
                  cursor: 'pointer',
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  font: 'inherit',
                  color: 'inherit',
                  fontWeight: 600,
                  '&:hover': { textDecoration: 'underline' },
                }}
                title="Add to line(s)"
                aria-label={`Add ${idx + 1} to line(s)`}
              >
                {idx + 1}
              </Box>
            </TableCell>
            <TableCell sx={{ borderBottom: 'none', pl: isFullScreen ? 1 : undefined, pr: 0.5, verticalAlign: 'middle', ...(isFullScreen ? { width: '50%', minWidth: 0 } : { width: 'auto', whiteSpace: 'nowrap' }) }}>
              {line.readOnly ? (
                <Box
                  component="span"
                  sx={(theme) => ({
                    display: isPhone && isFullScreen ? 'block' : 'inline',
                    ...(isPhone && isFullScreen
                      ? {
                          width: '100%',
                          maxWidth: '100%',
                          overflowX: 'auto',
                          overflowY: 'hidden',
                          whiteSpace: 'nowrap',
                          WebkitOverflowScrolling: 'touch',
                        }
                      : {}),
                    fontSize: 16,
                    py: isMobile ? 0.5 : 1,
                    ...inputUnderlineSx(theme),
                    '& .clickable-char': {
                      cursor: 'pointer',
                      borderRadius: 1,
                      '&:hover': { backgroundColor: (innerTheme) => alpha(innerTheme.palette.primary.main, innerTheme.palette.action.hoverOpacity) },
                    },
                  })}
                >
                  {(line.formula || '').split('').map((char, i) => {
                    const isLetter = /^[a-zA-Z]$/.test(char)
                    return isLetter ? (
                      <Box
                        component="span"
                        key={`${idx}-${i}`}
                        className="clickable-char"
                        onPointerDown={(e) => e.preventDefault()}
                        onClick={() => handleSymbolInsert({ insert: char })}
                        aria-label={getInsertSymbolLabel({ insert: char })}
                      >
                        {char}
                      </Box>
                    ) : (
                      <Box component="span" key={`${idx}-${i}`}>{char}</Box>
                    )
                  })}
                </Box>
              ) : (
                // use the custom keyboard for formula entry on phones
                isPhone ? (
                  <Box sx={{ width: '100%' }}>
                    <MobileLogicInput
                      value={line.formula}
                      onChange={(nextValue) => handleLineChange(idx, 'formula', nextValue)}
                      onFocus={() => {
                        if (line.readOnly) return
                        setActiveFormulaIndex(idx)
                      }}
                      onBlur={() => {
                        handleLineCommit(idx, 'formula', normalizeFormulaForCheck(line.formula))
                      }}
                      onCursorChange={(position) => {
                        if (line.readOnly) return
                        const safePosition = Number.isFinite(position) ? position : 0
                        const maxPosition = (line.formula || '').length
                        const clamped = Math.max(0, Math.min(safePosition, maxPosition))
                        formulaRefs.current[idx]?.setSelectionRange?.(clamped, clamped)
                      }}
                      inputRef={(el) => {
                        if (el) {
                          formulaRefs.current[idx] = el
                        }
                      }}
                      disabled={line.readOnly}
                      placeholder={idx === premises.length ? 'Statement' : ''}
                      aria-label={`Formula for line ${idx + 1}`}
                      includeQuantifiers={derivationKeyboardConfig?.isPredicateMode}
                      predicateLetters={derivationKeyboardConfig?.isPredicateMode ? derivationKeyboardConfig.predicateLetters : undefined}
                      constantLetters={derivationKeyboardConfig?.isPredicateMode ? derivationKeyboardConfig.constantLetters : undefined}
                      variableLetters={derivationKeyboardConfig?.isPredicateMode ? derivationKeyboardConfig.variableLetters : undefined}
                      symbolizationKey={derivationKeyboardConfig?.symbolizationKey}
                    />
                  </Box>
                ) : (
                  <TextField
                    variant="standard"
                    placeholder={idx === premises.length ? 'Statement' : ''}
                    value={line.formula}
                    onChange={(e) => handleLineChange(idx, 'formula', e.target.value)}
                    onKeyDown={(e) => handleFormulaKeyDown(e, idx, line.readOnly)}
                    onPointerDown={(e) => {
                      if (line.readOnly) return
                      if (canOpenFullScreen) {
                        e.preventDefault()
                        e.stopPropagation()
                        handleInputRequestFullScreen(idx, 'formula')
                      }
                    }}
                    onClick={(e) => {
                      if (line.readOnly) return
                      updateCursorPosition(idx, e)
                    }}
                    onMouseUp={(e) => {
                      if (line.readOnly) return
                      updateCursorPosition(idx, e)
                    }}
                    onKeyUp={(e) => {
                      if (line.readOnly) return
                      updateCursorPosition(idx, e)
                    }}
                    onSelect={(e) => {
                      if (line.readOnly) return
                      updateCursorPosition(idx, e)
                    }}
                    onBlur={(e) => {
                      updateCursorPosition(idx, e)
                      handleLineCommit(idx, 'formula', normalizeFormulaForCheck(e.target.value))
                    }}
                    InputProps={{ readOnly: line.readOnly }}
                    inputProps={{ autoComplete: 'off' }}
                    inputRef={(el) => { if (el) formulaRefs.current[idx] = el }}
                    onFocus={(e) => {
                      if (line.readOnly) return
                      setActiveFormulaIndex(idx)
                      updateCursorPosition(idx, e)
                    }}
                    sx={(theme) => ({
                      width: isFullScreen ? '100%' : { xs: '100%', md: 280 },
                      minWidth: isFullScreen ? 0 : undefined,
                      ...inputUnderlineSx(theme),
                      '& .MuiInputBase-input': {
                        fontSize: 16,
                        py: isMobile ? 0.5 : 1,
                      },
                    })}
                  />
                )
              )}
            </TableCell>
            <TableCell
              sx={{
                borderBottom: 'none',
                pl: 0.5,
                verticalAlign: 'middle',
                ...(isFullScreen ? { width: '50%', minWidth: 0 } : { width: 'auto', whiteSpace: 'nowrap' }),
                '& .line-delete': {
                  opacity: isPhone && isFullScreen
                    ? (activeFormulaIndex === idx ? 1 : 0)
                    : 0,
                  transition: 'opacity 120ms ease',
                },
                ...(!(isPhone && isFullScreen) && { '&:hover .line-delete': { opacity: 1 } }),
              }}
            >
              {idx < premises.length ? (
                idx === premises.length - 1 ? (
                  <Box
                    component="span"
                    sx={{ fontSize: 16, color: 'text.primary', '& .clickable-char': { cursor: 'pointer', borderRadius: 1, '&:hover': { backgroundColor: (theme) => alpha(theme.palette.primary.main, theme.palette.action.hoverOpacity) } } }}
                  >
                    {(proof?.conclusion ? `// ${proof.conclusion}` : '').split('').map((char, i) => {
                      const isLetter = /^[a-zA-Z]$/.test(char)
                      return isLetter ? (
                        <Box component="span" key={`conc-row-${idx}-${i}`} className="clickable-char" onPointerDown={(e) => e.preventDefault()} onClick={() => handleSymbolInsert({ insert: char })} aria-label={getInsertSymbolLabel({ insert: char })}>
                          {char}
                        </Box>
                      ) : (
                        <Box component="span" key={`conc-row-${idx}-${i}`}>{char}</Box>
                      )
                    })}
                  </Box>
                ) : (
                  <Typography sx={{ color: 'transparent' }}>—</Typography>
                )
              ) : (
                <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flexWrap: 'nowrap', gap: 0, minWidth: 0 }}>
                  {useRuleDropdown ? (
                    <>
                      {!ASSUMPTION_RULES.has(getRuleFromJustification(line.justification).toUpperCase()) && (
                        <TextField
                          variant="standard"
                          placeholder="Line(s)"
                          value={lineDrafts[idx] ?? formatJustificationLines(line.justification)}
                          onFocus={() => {
                            setActiveFormulaIndex(idx)
                          }}
                          onPointerDown={(e) => {
                            if (line.readOnly) return
                            if (canOpenFullScreen) {
                              e.preventDefault()
                              e.stopPropagation()
                              handleInputRequestFullScreen(idx, 'justification')
                            }
                          }}
                          onChange={(e) => {
                            const raw = e.target.value
                            setLineDrafts((prev) => ({ ...prev, [idx]: raw }))
                            handleLineChange(
                              idx,
                              'justification',
                              applyLinesToJustification(line.justification, raw)
                            )
                          }}
                          onKeyDown={(e) => handleJustKeyDown(e, idx, line.readOnly)}
                          onBlur={(e) => {
                            const raw = e.target.value
                            handleLineCommit(
                              idx,
                              'justification',
                              applyLinesToJustification(line.justification, raw)
                            )
                            setLineDrafts((prev) => {
                              if (!(idx in prev)) return prev
                              const next = { ...prev }
                              delete next[idx]
                              return next
                            })
                          }}
                          InputProps={{ readOnly: line.readOnly }}
                          inputProps={{ autoComplete: 'off' }}
                          inputRef={(el) => { if (el) justRefs.current[idx] = el }}
                          sx={(theme) => ({
                            width: '7ch',
                            maxWidth: '7ch',
                            minWidth: '7ch',
                            ...inputUnderlineSx(theme),
                            '& .MuiInputBase-input': {
                              fontSize: 16,
                              py: isMobile ? 0.5 : 1,
                            },
                          })}
                        />
                      )}
                      {allowedRules.length > 0 && (
                        <FormControl variant="standard" sx={{ minWidth: isFullScreen || isMobile ? 56 : 70 }}>
                          <Select
                            value={getRuleFromJustification(line.justification)}
                            displayEmpty
                            onFocus={() => {
                              setActiveFormulaIndex(idx)
                            }}
                            onChange={(e) => {
                              const selectedRule = String(e.target.value || '')
                              const upperRule = selectedRule.toUpperCase()
                              const nextValue = ASSUMPTION_RULES.has(upperRule)
                                ? applyRuleToJustification('', selectedRule)
                                : applyRuleToJustification(line.justification, selectedRule)
                              commitLines((prev) => {
                                let nextLines = prev.map((prevLine, prevIdx) =>
                                  prevIdx === idx ? { ...prevLine, justification: nextValue } : prevLine
                                )
                                if (ASSUMPTION_RULES.has(upperRule)) {
                                  const nextIdx = idx + 1
                                  const nextLine = nextLines[nextIdx]
                                  const isBlankLine = nextLine &&
                                    !nextLine.readOnly &&
                                    !(nextLine.formula || '').trim() &&
                                    !(nextLine.justification || '').trim()
                                  if (nextLine && isBlankLine) {
                                    return nextLines
                                  }
                                  if (!nextLine || !nextLine.readOnly) {
                                    const newLine = { formula: '', justification: '', readOnly: false }
                                    nextLines = [
                                      ...nextLines.slice(0, nextIdx),
                                      newLine,
                                      ...nextLines.slice(nextIdx),
                                    ]
                                    pendingFocusRef.current = nextIdx
                                  }
                                }
                                return nextLines
                              }, idx)
                              if (ASSUMPTION_RULES.has(upperRule)) {
                                setLineDrafts((prev) => {
                                  if (!(idx in prev)) return prev
                                  const next = { ...prev }
                                  delete next[idx]
                                  return next
                                })
                              }
                            }}
                            renderValue={(value) => value || 'Rule'}
                            sx={(theme) => ({
                              '& .MuiSelect-select': { fontSize: 16, py: isMobile ? 0.5 : 1 },
                              '& .MuiInputBase-input': { fontSize: 16, py: isMobile ? 0.5 : 1 },
                              '& .MuiSelect-select.MuiInputBase-input': { display: 'flex', alignItems: 'center' },
                              ...selectUnderlineSx(theme),
                            })}
                            MenuProps={{
                              PaperProps: { sx: { '& .MuiMenuItem-root': { fontSize: 16 } } }
                            }}
                          >
                            <MenuItem value="">
                              <em>Rule</em>
                            </MenuItem>
                            {allowedRules.map((rule) => (
                              <MenuItem key={rule} value={rule}>
                                {rule}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      )}
                    </>
                  ) : (
                    <TextField
                      variant="standard"
                      placeholder={idx === premises.length ? 'line(s) and rule' : ''}
                      value={line.justification}
                      onFocus={() => {
                        if (!line.readOnly) {
                          setActiveFormulaIndex(idx)
                        }
                      }}
                      onPointerDown={(e) => {
                        if (line.readOnly) return
                        if (canOpenFullScreen) {
                          e.preventDefault()
                          e.stopPropagation()
                          handleInputRequestFullScreen(idx, 'justification')
                        }
                      }}
                      onChange={(e) => handleLineChange(idx, 'justification', e.target.value)}
                      onKeyDown={(e) => handleJustKeyDown(e, idx, line.readOnly)}
                      onBlur={(e) => {
                        const raw = (e.target.value || '').trim()
                        const formatted = raw ? formatJustificationDisplay(raw) : ''
                        if (formatted !== raw) {
                          handleLineChange(idx, 'justification', formatted)
                        }
                        handleLineCommit(idx, 'justification', formatted || raw)
                      }}
                      InputProps={{ readOnly: line.readOnly }}
                      inputProps={{ autoComplete: 'off' }}
                      inputRef={(el) => { if (el) justRefs.current[idx] = el }}
                      sx={(theme) => ({
                        width: { xs: 'calc(7ch + 56px)', sm: 'calc(7ch + 70px)' },
                        maxWidth: { xs: 'calc(7ch + 56px)', sm: 'calc(7ch + 70px)' },
                        minWidth: { xs: 'calc(7ch + 56px)', sm: 'calc(7ch + 70px)' },
                        ...inputUnderlineSx(theme),
                        '& .MuiInputBase-input': {
                          fontSize: 16,
                          py: isMobile ? 0.5 : 1,
                        },
                      })}
                    />
                  )}
                  {autoCheckEnabled && autoCheckState.perLine[idx] === 'ok' && (
                    <CheckCircleIcon fontSize="small" sx={{ color: 'primary.main' }} />
                  )}
                  {autoCheckEnabled && autoCheckState.perLine[idx] === 'error' && (
                    <CancelIcon fontSize="small" color="error" />
                  )}
                  {idx >= premises.length && !line.readOnly && (
                    <Tooltip title="Delete line">
                      <IconButton
                        onClick={() => deleteLine(idx)}
                        size="small"
                        aria-label={`Delete line ${idx + 1}`}
                        className="line-delete"
                        sx={plainIconButtonSx}
                      >
                        <RemoveIcon />
                      </IconButton>
                    </Tooltip>
                  )}
                </Stack>
              )}
            </TableCell>
          </TableRow>
        )
      })}
    </>
  )
}

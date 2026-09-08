import * as React from 'react'
import { Box, Button, IconButton, Stack, TextField, Typography } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'

export function FormulaListEditor({
  label,
  values,
  onChange,
  placeholder,
  secondaryValues,
  secondaryLabel,
  secondaryPlaceholder,
}) {
  const list = Array.isArray(values) && values.length ? values : ['']
  const hasSecondaryValues = Array.isArray(secondaryValues)
  const secondaryList = hasSecondaryValues
    ? list.map((_, index) => String(secondaryValues[index] ?? ''))
    : null
  const emitChange = (nextValues, nextSecondaryValues = secondaryList, removedIndex) => {
    onChange(nextValues, nextSecondaryValues, removedIndex)
  }
  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>{label}</Typography>
      {list.map((formula, index) => (
        <Stack
          key={index}
          direction={hasSecondaryValues ? { xs: 'column', sm: 'row' } : 'row'}
          alignItems={hasSecondaryValues ? { xs: 'stretch', sm: 'center' } : 'center'}
          spacing={1}
          sx={{ mb: 1 }}
        >
          <TextField
            size="small"
            value={formula}
            onChange={(event) => {
              const next = [...list]
              next[index] = event.target.value
              emitChange(next)
            }}
            fullWidth
            placeholder={`${placeholder} ${index + 1}`}
          />
          {hasSecondaryValues && (
            <TextField
              size="small"
              value={secondaryList[index]}
              onChange={(event) => {
                const next = [...secondaryList]
                next[index] = event.target.value
                emitChange(list, next)
              }}
              fullWidth
              label={secondaryLabel}
              placeholder={secondaryPlaceholder}
            />
          )}
          <IconButton
            size="small"
            onClick={() => {
              const next = list.filter((_, itemIndex) => itemIndex !== index)
              const nextSecondary = secondaryList?.filter((_, itemIndex) => itemIndex !== index)
              emitChange(next, nextSecondary, index)
            }}
            aria-label={`Remove ${placeholder.toLowerCase()} ${index + 1}`}
          >
            <DeleteOutlineIcon />
          </IconButton>
        </Stack>
      ))}
      <Button
        size="small"
        startIcon={<AddIcon />}
        onClick={() => emitChange(
          [...list, ''],
          secondaryList ? [...secondaryList, ''] : null
        )}
      >
        Add {placeholder.toLowerCase()}
      </Button>
    </Box>
  )
}

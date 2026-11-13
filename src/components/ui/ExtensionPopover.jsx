import { Alert, Box, Button, LinearProgress, Popover, Stack, TextField, Typography } from '@mui/material'

export default function ExtensionPopover({
  anchorEl,
  anchorHorizontal = 'right',
  assignmentName,
  date,
  error,
  onClose,
  onDateChange,
  onSave,
  onTimeChange,
  saving,
  time,
}) {
  return (
    <Popover
      open={Boolean(anchorEl)}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: anchorHorizontal }}
      transformOrigin={{ vertical: 'top', horizontal: anchorHorizontal }}
      slotProps={{ paper: { sx: { p: 2, width: 320 } } }}
    >
      <Stack spacing={2}>
        <Box>
          <Typography variant="subtitle2" fontWeight={600}>Extension</Typography>
          <Typography variant="caption" color="text.secondary">{assignmentName ?? 'Assignment'}</Typography>
        </Box>
        {saving && <LinearProgress />}
        {error && <Alert severity="error">{error}</Alert>}
        <TextField
          label="New Due Date"
          type="date"
          value={date}
          onChange={(e) => onDateChange(e.target.value)}
          InputLabelProps={{ shrink: true }}
          fullWidth
        />
        <TextField
          label="New Due Time"
          type="time"
          value={time}
          onChange={(e) => onTimeChange(e.target.value)}
          InputLabelProps={{ shrink: true }}
          fullWidth
        />
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="contained" onClick={onSave} disabled={saving}>
            Save Extension
          </Button>
        </Box>
      </Stack>
    </Popover>
  )
}

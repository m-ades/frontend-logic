import {
  Alert,
  Box,
  Button,
  FormControlLabel,
  LinearProgress,
  Popover,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";

export default function AccommodationPopover({ accommodation, studentName }) {
  const {
    anchorEl,
    close,
    error,
    extraLateDays,
    latePenaltyWaived,
    loading,
    save,
    saved,
    setExtraLateDays,
    setLatePenaltyWaived,
  } = accommodation;

  const handleExtraLateDaysChange = (event) => {
    const next = event.target.value;
    if (next === "") {
      setExtraLateDays("");
      return;
    }
    const parsed = parseInt(next, 10);
    if (Number.isNaN(parsed)) return;
    setExtraLateDays(String(Math.max(0, parsed)));
  };

  return (
    <Popover
      open={Boolean(anchorEl)}
      anchorEl={anchorEl}
      onClose={close}
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      transformOrigin={{ vertical: "top", horizontal: "right" }}
      slotProps={{ paper: { sx: { p: 2, width: 320 } } }}
    >
      <Stack spacing={2}>
        <Box>
          <Typography variant="subtitle2" fontWeight={600}>
            Accommodations
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {studentName ?? "Student"}
          </Typography>
        </Box>
        {loading && <LinearProgress />}
        {error && <Alert severity="error">{error}</Alert>}
        {saved && <Alert severity="success">Accommodations saved.</Alert>}
        <TextField
          label="Extra Late Days"
          type="number"
          value={extraLateDays}
          onChange={handleExtraLateDaysChange}
          inputProps={{ min: 0, max: 365 }}
          size="small"
          fullWidth
          disabled={loading}
        />
        <FormControlLabel
          control={
            <Switch
              checked={latePenaltyWaived}
              onChange={(e) => setLatePenaltyWaived(e.target.checked)}
              disabled={loading}
            />
          }
          label="Waive late penalty"
        />
        <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
          <Button onClick={close}>Cancel</Button>
          <Button variant="contained" onClick={save} disabled={loading}>
            Save
          </Button>
        </Box>
      </Stack>
    </Popover>
  );
}

import { useState } from "react";
import {
  Box,
  Typography,
  CardContent,
  Stack,
  TextField,
  Button,
  Divider,
  Alert,
  InputAdornment,
  Switch,
  FormControlLabel,
} from "@mui/material";
import { Save, AlertCircle } from "lucide-react";
import ThemedCard from "../../../components/ui/ThemedCard.jsx";

export default function LatePolicySection({ course, onSave }) {
  const [lateSubmissionsEnabled, setLateSubmissionsEnabled] = useState(
    course?.latePolicy?.enabled ?? true
  );
  const [lateDaysAllowed, setLateDaysAllowed] = useState(
    course?.latePolicy?.maxDaysLate ?? 7
  );
  const [latePenalty, setLatePenalty] = useState(
    course?.latePolicy?.penalty ?? 20
  );

  const handleSave = () => {
    onSave({
      latePolicy: {
        enabled: lateSubmissionsEnabled,
        maxDaysLate: lateDaysAllowed,
        penalty: latePenalty,
      },
    });
  };

  const hasChanges =
    lateSubmissionsEnabled !== (course?.latePolicy?.enabled ?? true) ||
    lateDaysAllowed !== (course?.latePolicy?.maxDaysLate ?? 7) ||
    latePenalty !== (course?.latePolicy?.penalty ?? 20);

  return (
    <ThemedCard sx={{ mb: 3 }}>
      <CardContent>
        <Stack spacing={3}>
          <Box>
            <Typography variant="h6" fontWeight={600} mb={0.5}>
              Late Submission Policy
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Configure how late assignments are handled
            </Typography>
          </Box>

          <Divider />

          <FormControlLabel
            control={
              <Switch
                checked={lateSubmissionsEnabled}
                onChange={(e) => setLateSubmissionsEnabled(e.target.checked)}
              />
            }
            label={
              <Box>
                <Typography variant="body1" fontWeight={500}>
                  Allow Late Submissions
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Students can submit assignments after the due date
                </Typography>
              </Box>
            }
          />

          {lateSubmissionsEnabled && (
            <Stack spacing={3} sx={{ pl: 2 }}>
              <Alert icon={<AlertCircle size={20} />} severity="info">
                Late submissions will be accepted with a flat penalty applied to
                the final grade
              </Alert>

              <TextField
                label="Maximum Late Days"
                type="number"
                value={lateDaysAllowed}
                onChange={(e) =>
                  setLateDaysAllowed(Math.max(0, parseInt(e.target.value) || 0))
                }
                inputProps={{ min: 0, max: 30 }}
                helperText="Maximum number of days after due date that submissions are accepted"
                sx={{ maxWidth: 300 }}
              />

              <TextField
                label="Late Penalty"
                type="number"
                value={latePenalty}
                onChange={(e) =>
                  setLatePenalty(
                    Math.max(0, Math.min(100, parseInt(e.target.value) || 0))
                  )
                }
                slotProps={{
                  endAdornment: (
                    <InputAdornment position="end">%</InputAdornment>
                  ),
                }}
                inputProps={{ min: 0, max: 100 }}
                helperText="Flat percentage deducted for any late submission (0-100%)"
                sx={{ maxWidth: 300 }}
              />

              <Box
                sx={{
                  p: 2,
                  backgroundColor: "action.hover",
                  borderRadius: 2,
                  border: "1px solid",
                  borderColor: "divider",
                }}
              >
                <Typography variant="subtitle2" fontWeight={600} mb={1}>
                  Example Calculation
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  A student submits an assignment late (within {lateDaysAllowed}{" "}
                  days) with an earned score of 90%:
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 1 }}
                >
                  • Late Penalty: {latePenalty}% deduction (flat rate)
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • Final Score: 90% - {latePenalty}% ={" "}
                  {Math.max(0, 90 - latePenalty)}%
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 1, fontStyle: "italic" }}
                >
                  Note: Submissions beyond {lateDaysAllowed} days late will
                  receive 0%
                </Typography>
              </Box>
            </Stack>
          )}
        </Stack>
      </CardContent>

      <Box sx={{ px: 3, pb: 3, display: "flex", justifyContent: "flex-end" }}>
        <Button
          variant="contained"
          startIcon={<Save size={18} />}
          onClick={handleSave}
          size="small"
          disabled={!hasChanges}
        >
          Save Late Policy
        </Button>
      </Box>
    </ThemedCard>
  );
}

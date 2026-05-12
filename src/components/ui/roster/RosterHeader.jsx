import { Box, Typography, Button } from "@mui/material";
import { Plus, Download, Upload } from "lucide-react";

export default function RosterHeader({
  courseCode,
  onAddStudent,
  onImport,
  onExport,
}) {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        mb: 3,
        gap: 2,
        flexWrap: "wrap",
      }}
    >
      <Box>
        <Typography variant="h4" component="h1" fontWeight={600}>
          Course Roster
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {courseCode} - Manage student enrollment
        </Typography>
      </Box>

      <Box sx={{ display: "flex", gap: 1 }}>
        <Button
          variant="outlined"
          startIcon={<Upload size={18} />}
          onClick={onImport}
          size="small"
        >
          Import CSV
        </Button>
        <Button
          variant="outlined"
          startIcon={<Download size={18} />}
          onClick={onExport}
          size="small"
        >
          Export
        </Button>
        <Button
          variant="contained"
          startIcon={<Plus size={20} />}
          onClick={onAddStudent}
        >
          Add Student
        </Button>
      </Box>
    </Box>
  );
}

import { TextField, InputAdornment } from "@mui/material";
import { Search } from "lucide-react";

export default function RosterSearchBar({ value, onChange }) {
  return (
    <TextField
      fullWidth
      placeholder="Search by name or email..."
      value={value}
      onChange={(e) => onChange(e.target.value)}
      sx={{ mb: 3 }}
      slotProps={{
        input: {
          startAdornment: (
            <InputAdornment position="start">
              <Search size={20} />
            </InputAdornment>
          ),
        },
      }}
    />
  );
}

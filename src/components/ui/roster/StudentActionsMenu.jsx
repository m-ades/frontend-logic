import { Menu, MenuItem } from "@mui/material";
import { User, UserX } from "lucide-react";

export default function StudentActionsMenu({
  anchorEl,
  student,
  onClose,
  onViewProfile,
  onRemoveStudent,
}) {
  return (
    <Menu
      anchorEl={anchorEl}
      open={Boolean(anchorEl)}
      onClose={onClose}
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      transformOrigin={{ vertical: "top", horizontal: "right" }}
    >
      <MenuItem onClick={() => onViewProfile(student)}>
        <User size={16} style={{ marginRight: 8 }} />
        View Profile
      </MenuItem>
      <MenuItem
        onClick={() => onRemoveStudent(student?.id)}
        sx={{ color: "error.main" }}
      >
        <UserX size={16} style={{ marginRight: 8 }} />
        Remove from Course
      </MenuItem>
    </Menu>
  );
}

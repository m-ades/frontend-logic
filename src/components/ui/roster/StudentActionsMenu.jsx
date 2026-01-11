import { Menu, MenuItem } from "@mui/material";
import { Edit, Mail, UserX } from "lucide-react";

export default function StudentActionsMenu({
  anchorEl,
  student,
  onClose,
  onViewProfile,
  onSendEmail,
  onEditStudent,
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
        <Edit size={16} style={{ marginRight: 8 }} />
        View Profile
      </MenuItem>
      <MenuItem onClick={() => onSendEmail(student)}>
        <Mail size={16} style={{ marginRight: 8 }} />
        Send Email
      </MenuItem>
      <MenuItem onClick={() => onEditStudent(student)}>
        <Edit size={16} style={{ marginRight: 8 }} />
        Edit Student
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

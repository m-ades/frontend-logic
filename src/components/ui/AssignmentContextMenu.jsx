import { Menu, MenuItem } from "@mui/material";
import { Edit, Copy, Trash2 } from "lucide-react";

export default function AssignmentContextMenu({
  anchorEl,
  open,
  onClose,
  item,
  onEdit,
  onDuplicate,
  onDelete,
}) {
  return (
    <Menu
      anchorEl={anchorEl}
      open={open}
      onClose={onClose}
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      transformOrigin={{ vertical: "top", horizontal: "right" }}
    >
      <MenuItem onClick={() => onEdit(item)}>
        <Edit size={16} style={{ marginRight: 8 }} />
        Edit Settings
      </MenuItem>
      <MenuItem onClick={() => onDuplicate(item)}>
        <Copy size={16} style={{ marginRight: 8 }} />
        Duplicate
      </MenuItem>
      <MenuItem onClick={() => onDelete(item?.id)} sx={{ color: "error.main" }}>
        <Trash2 size={16} style={{ marginRight: 8 }} />
        Delete
      </MenuItem>
    </Menu>
  );
}

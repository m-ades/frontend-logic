import { Menu, MenuItem } from "@mui/material";
import { FileEdit, Edit, Copy, Trash2, ListChecks } from "lucide-react";

export default function AssignmentContextMenu({
  anchorEl,
  open,
  onClose,
  item,
  onOpenBuilder,
  onEdit,
  onDuplicate,
  onDelete,
  onViewSubmissions,
}) {
  const select = (handler) => () => {
    onClose?.();
    handler?.(item);
  };

  return (
    <Menu
      anchorEl={anchorEl}
      open={open}
      onClose={onClose}
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      transformOrigin={{ vertical: "top", horizontal: "right" }}
    >
      <MenuItem onClick={select(onOpenBuilder)}>
        <FileEdit size={16} style={{ marginRight: 8 }} />
        Open Builder
      </MenuItem>
      <MenuItem onClick={select(onEdit)}>
        <Edit size={16} style={{ marginRight: 8 }} />
        Edit Settings
      </MenuItem>
      {onViewSubmissions && (
        <MenuItem onClick={select(onViewSubmissions)}>
          <ListChecks size={16} style={{ marginRight: 8 }} />
          View submissions
        </MenuItem>
      )}
      <MenuItem onClick={select(onDuplicate)}>
        <Copy size={16} style={{ marginRight: 8 }} />
        Duplicate
      </MenuItem>
      <MenuItem
        onClick={() => {
          onClose?.();
          onDelete?.(item?.id);
        }}
        sx={{ color: "error.main" }}
      >
        <Trash2 size={16} style={{ marginRight: 8 }} />
        Delete
      </MenuItem>
    </Menu>
  );
}

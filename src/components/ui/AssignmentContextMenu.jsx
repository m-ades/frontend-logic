import { Menu, MenuItem } from "@mui/material";
import { FileEdit, Edit, Copy, Trash2, CalendarClock, List, ListChecks } from "lucide-react";
import { Link as RouterLink } from "react-router-dom";
import { isPlainLinkClick } from "../../utils/linkNavigation.js";

export default function AssignmentContextMenu({
  anchorEl,
  open,
  onClose,
  item,
  builderPath,
  navigationState,
  onEdit,
  onDuplicate,
  onDelete,
  onClasswideExtension,
  onViewExtensions,
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
      <MenuItem
        component={builderPath ? RouterLink : 'li'}
        to={builderPath}
        state={builderPath ? navigationState : undefined}
        disabled={!builderPath}
        onClick={(event) => {
          if (isPlainLinkClick(event)) onClose();
        }}
      >
        <FileEdit size={16} style={{ marginRight: 8 }} />
        Open Builder
      </MenuItem>
      <MenuItem onClick={select(onEdit)}>
        <Edit size={16} style={{ marginRight: 8 }} />
        Edit Settings
      </MenuItem>
      {onClasswideExtension && (
        <MenuItem onClick={select(onClasswideExtension)}>
          <CalendarClock size={16} style={{ marginRight: 8 }} />
          Classwide extension
        </MenuItem>
      )}
      {onViewExtensions && (
        <MenuItem onClick={select(onViewExtensions)}>
          <List size={16} style={{ marginRight: 8 }} />
          View extensions
        </MenuItem>
      )}
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

import { useMemo, useState } from 'react'
import {
  Box,
  Chip,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import {
  DragIndicator as DragIcon,
  Visibility as ShowIcon,
  VisibilityOff as HideIcon,
  DeleteOutline as DeleteIcon,
} from '@mui/icons-material'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  assignDynamicNumbers,
  canBeChildOf,
  canHaveChildren,
  nodesToTree,
  treeToNodes,
} from '@/components/textbook/textbookStructure.js'

function KindBadge({ kind }) {
  return (
    <Chip
      size="small"
      label={kind}
      variant="outlined"
      sx={{ textTransform: 'capitalize', height: 22, fontSize: '0.7rem' }}
    />
  )
}

function StructureRow({
  node,
  depth,
  numberPreview,
  onRename,
  onToggleHidden,
  onRemove,
  dragHandleProps,
  isDragging,
}) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        py: 0.75,
        px: 1,
        pl: 1 + depth * 2.5,
        borderBottom: 1,
        borderColor: 'divider',
        bgcolor: isDragging ? 'action.selected' : node.hidden ? 'action.hover' : 'background.paper',
        opacity: node.hidden ? 0.65 : 1,
      }}
    >
      <IconButton
        size="small"
        {...dragHandleProps}
        aria-label={`Drag ${node.displayTitle || node.slug}`}
        sx={{ cursor: 'grab', touchAction: 'none' }}
      >
        <DragIcon fontSize="small" />
      </IconButton>

      {numberPreview ? (
        <Typography
          variant="caption"
          sx={{
            minWidth: 1.75 * 16,
            fontWeight: 700,
            color: 'text.secondary',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {numberPreview}
        </Typography>
      ) : (
        <Box sx={{ minWidth: 1.75 * 16 }} />
      )}

      <KindBadge kind={node.kind} />

      <TextField
        size="small"
        value={node.displayTitle}
        onChange={(event) => onRename(node.id, event.target.value)}
        aria-label={`Display title for ${node.slug}`}
        sx={{ flexGrow: 1, minWidth: 0 }}
        inputProps={{ sx: { fontSize: '0.875rem', py: 0.75 } }}
      />

      <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', md: 'block' } }}>
        {node.slug}
      </Typography>

      <Tooltip title={node.hidden ? 'Show in Learn' : 'Hide from Learn'}>
        <IconButton
          size="small"
          onClick={() => onToggleHidden(node.id)}
          aria-label={node.hidden ? `Show ${node.slug}` : `Hide ${node.slug}`}
        >
          {node.hidden ? <HideIcon fontSize="small" /> : <ShowIcon fontSize="small" />}
        </IconButton>
      </Tooltip>

      <Tooltip title="Remove from course structure (file stays on disk)">
        <IconButton
          size="small"
          onClick={() => onRemove(node.id)}
          aria-label={`Remove ${node.slug} from structure`}
        >
          <DeleteIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Box>
  )
}

function SortableRow(props) {
  const { node } = props
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: node.id,
    data: { node },
  })

  return (
    <Box
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 1 : undefined,
      }}
    >
      <StructureRow
        {...props}
        isDragging={isDragging}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </Box>
  )
}

function flattenTree(tree, depth = 0, out = []) {
  for (const node of tree) {
    out.push({ node, depth })
    if (node.children?.length) flattenTree(node.children, depth + 1, out)
  }
  return out
}

function findNodeInTree(tree, id) {
  for (const node of tree) {
    if (node.id === id) return node
    const found = findNodeInTree(node.children || [], id)
    if (found) return found
  }
  return null
}

function removeNodeFromTree(tree, id) {
  const next = []
  for (const node of tree) {
    if (node.id === id) continue
    next.push({
      ...node,
      children: removeNodeFromTree(node.children || [], id),
    })
  }
  return next
}

function insertRelative(tree, activeId, overId, { asChild = false } = {}) {
  const active = findNodeInTree(tree, activeId)
  if (!active) return tree

  let working = removeNodeFromTree(tree, activeId)
  const over = findNodeInTree(working, overId)
  if (!over) {
    // Dropped on self-removal edge case — append to root
    return [...working, { ...active, children: active.children || [], parentId: null }]
  }

  if (asChild && canHaveChildren(over.kind) && canBeChildOf(active.kind, over.kind)) {
    return working.map((node) => mapInsertChild(node, overId, active))
  }

  return insertBeside(working, overId, active)
}

function mapInsertChild(node, parentId, active) {
  if (node.id === parentId) {
    return {
      ...node,
      children: [...(node.children || []), { ...active, children: active.children || [] }],
    }
  }
  return {
    ...node,
    children: (node.children || []).map((child) => mapInsertChild(child, parentId, active)),
  }
}

function insertBeside(tree, overId, active) {
  const result = []
  for (const node of tree) {
    if (node.id === overId) {
      result.push(node)
      result.push({ ...active, children: active.children || [] })
      continue
    }
    result.push({
      ...node,
      children: insertBeside(node.children || [], overId, active),
    })
  }
  return result
}

/**
 * Nested structure editor with dnd-kit reorder + drop-onto-part to nest.
 */
export default function TextbookStructureEditor({ nodes, onChange }) {
  const tree = useMemo(() => nodesToTree(nodes, { includeHidden: true }), [nodes])
  const numbered = useMemo(
    () => assignDynamicNumbers(tree, { includeHidden: true }),
    [tree],
  )
  const flat = useMemo(() => flattenTree(numbered), [numbered])
  const ids = useMemo(() => flat.map(({ node }) => node.id), [flat])

  const [activeId, setActiveId] = useState(null)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  )

  const activeNode = activeId ? findNodeInTree(tree, activeId) : null

  const commitTree = (nextTree) => {
    onChange(treeToNodes(nextTree))
  }

  const handleRename = (id, displayTitle) => {
    onChange(
      nodes.map((node) => (node.id === id ? { ...node, displayTitle } : node)),
    )
  }

  const handleToggleHidden = (id) => {
    onChange(
      nodes.map((node) => (node.id === id ? { ...node, hidden: !node.hidden } : node)),
    )
  }

  const handleRemove = (id) => {
    const target = nodes.find((node) => node.id === id)
    if (!target) return
    // Promote children to the removed node's parent
    const next = nodes
      .filter((node) => node.id !== id)
      .map((node) =>
        node.parentId === id
          ? { ...node, parentId: target.parentId }
          : node,
      )
    onChange(next)
  }

  const handleDragEnd = (event) => {
    const { active, over } = event
    setActiveId(null)
    if (!over || active.id === over.id) return

    const activeItem = findNodeInTree(tree, active.id)
    const overItem = findNodeInTree(tree, over.id)
    if (!activeItem || !overItem) return

    // Drop onto a part/backmatter → nest as child (when allowed)
    const nestAsChild =
      canHaveChildren(overItem.kind) &&
      canBeChildOf(activeItem.kind, overItem.kind) &&
      activeItem.id !== overItem.id

    if (nestAsChild) {
      commitTree(insertRelative(tree, active.id, over.id, { asChild: true }))
      return
    }

    // Same-parent sibling reorder
    if ((activeItem.parentId || null) === (overItem.parentId || null)) {
      const parentId = activeItem.parentId || null
      const siblings = (
        parentId
          ? findNodeInTree(tree, parentId)?.children || []
          : tree
      ).map((node) => node.id)
      const oldIndex = siblings.indexOf(active.id)
      const newIndex = siblings.indexOf(over.id)
      if (oldIndex < 0 || newIndex < 0) return

      const reordered = arrayMove(
        parentId ? findNodeInTree(tree, parentId).children : tree,
        oldIndex,
        newIndex,
      )

      if (!parentId) {
        commitTree(reordered)
      } else {
        const mapReplace = (list) =>
          list.map((node) => {
            if (node.id === parentId) return { ...node, children: reordered }
            return { ...node, children: mapReplace(node.children || []) }
          })
        commitTree(mapReplace(tree))
      }
      return
    }

    // Cross-parent move: place beside over item (same parent as over)
    // Disallow nesting parts under chapters via this path
    if (overItem.parentId) {
      const parent = findNodeInTree(tree, overItem.parentId)
      if (!canBeChildOf(activeItem.kind, parent?.kind)) return
    }

    commitTree(insertRelative(tree, active.id, over.id, { asChild: false }))
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={(event) => setActiveId(event.active.id)}
      onDragCancel={() => setActiveId(null)}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <Box
          sx={{
            border: 1,
            borderColor: 'divider',
            borderRadius: 1,
            overflow: 'hidden',
          }}
          aria-label="Textbook structure editor"
        >
          {flat.length === 0 ? (
            <Typography color="text.secondary" sx={{ p: 3 }}>
              No textbook files in structure. Sync from bundle to import the BookML HTML inventory.
            </Typography>
          ) : (
            flat.map(({ node, depth }) => (
              <SortableRow
                key={node.id}
                node={node}
                depth={depth}
                numberPreview={node.number}
                onRename={handleRename}
                onToggleHidden={handleToggleHidden}
                onRemove={handleRemove}
              />
            ))
          )}
        </Box>
      </SortableContext>

      <DragOverlay>
        {activeNode ? (
          <Box sx={{ boxShadow: 4, borderRadius: 1, bgcolor: 'background.paper' }}>
            <StructureRow
              node={activeNode}
              depth={0}
              numberPreview={null}
              onRename={() => {}}
              onToggleHidden={() => {}}
              onRemove={() => {}}
              dragHandleProps={{}}
              isDragging
            />
          </Box>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

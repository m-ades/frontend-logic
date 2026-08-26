import { useMemo, useState } from "react";
import {
  Box,
  Chip,
  Collapse,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  alpha,
} from "@mui/material";
import {
  ChevronDown,
  ChevronRight,
  Inbox,
  Search,
} from "lucide-react";
import { formatEasternFromIso } from "../../../utils/easternTime.js";
import {
  filterOrganizedSubmissions,
  organizeAssignmentSubmissions,
} from "../../../utils/assignmentSubmissions.js";

function ResultChip({ correct }) {
  return (
    <Chip
      size="small"
      label={correct ? "Correct" : "Incorrect"}
      color={correct ? "success" : "default"}
      variant={correct ? "filled" : "outlined"}
    />
  );
}

function HistoryAttempts({ latest, history }) {
  return (
    <Box
      sx={{
        mx: 1,
        mb: 1,
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 1.5,
        overflow: "hidden",
      }}
    >
      <Table size="small">
        <TableHead>
          <TableRow sx={{ backgroundColor: alpha("#000", 0.02) }}>
            <TableCell sx={{ fontWeight: 600 }}>Attempt history</TableCell>
            <TableCell align="right" sx={{ fontWeight: 600 }}>
              Score
            </TableCell>
            <TableCell align="center" sx={{ fontWeight: 600 }}>
              Result
            </TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Submitted</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {[latest, ...history].filter(Boolean).map((attempt, index) => (
            <TableRow
              key={attempt.id ?? `${attempt.user_id}-${attempt.attempt}-${index}`}
              sx={{ opacity: index === 0 ? 1 : 0.8 }}
            >
              <TableCell>
                Attempt {attempt.attempt}
                {index === 0 ? " (latest)" : ""}
                {attempt.auto_submitted ? " · auto" : ""}
              </TableCell>
              <TableCell align="right">
                {Number.isFinite(Number(attempt.score)) ? attempt.score : "—"}
              </TableCell>
              <TableCell align="center">
                <ResultChip correct={Boolean(attempt.is_correct)} />
              </TableCell>
              <TableCell>
                {formatEasternFromIso(attempt.submitted_at, { includeTime: true }) || "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}

function DetailRows({
  items,
  labelHeader,
  getKey,
  getTitle,
  getMeta,
}) {
  const [openHistory, setOpenHistory] = useState(() => new Set());

  const toggleHistory = (key) => {
    setOpenHistory((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <Table size="small">
      <TableHead>
        <TableRow sx={{ backgroundColor: alpha("#000", 0.02) }}>
          <TableCell sx={{ fontWeight: 600 }}>{labelHeader}</TableCell>
          <TableCell align="right" sx={{ fontWeight: 600 }}>
            Latest score
          </TableCell>
          <TableCell align="center" sx={{ fontWeight: 600 }}>
            Result
          </TableCell>
          <TableCell sx={{ fontWeight: 600 }}>Submitted</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {items.map((item) => {
          const key = getKey(item);
          const latest = item.latest;
          const hasHistory = item.history.length > 0;
          const historyOpen = openHistory.has(key);
          return [
            <TableRow key={`${key}-main`} hover>
              <TableCell>
                <Stack direction="row" spacing={1} alignItems="center">
                  {hasHistory ? (
                    <IconButton
                      size="small"
                      aria-label={historyOpen ? "Hide attempts" : "Show prior attempts"}
                      onClick={() => toggleHistory(key)}
                    >
                      {historyOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </IconButton>
                  ) : (
                    <Box sx={{ width: 28 }} />
                  )}
                  <Box>
                    <Typography variant="body2" fontWeight={500}>
                      {getTitle(item)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {getMeta(item)}
                    </Typography>
                  </Box>
                </Stack>
              </TableCell>
              <TableCell align="right">
                {Number.isFinite(Number(latest?.score)) ? latest.score : "—"}
              </TableCell>
              <TableCell align="center">
                <ResultChip correct={Boolean(latest?.is_correct)} />
              </TableCell>
              <TableCell>
                {formatEasternFromIso(latest?.submitted_at, { includeTime: true }) || "—"}
              </TableCell>
            </TableRow>,
            hasHistory ? (
              <TableRow key={`${key}-history`}>
                <TableCell colSpan={4} sx={{ py: 0, borderBottom: historyOpen ? undefined : 0 }}>
                  <Collapse in={historyOpen} timeout="auto" unmountOnExit>
                    <HistoryAttempts latest={latest} history={item.history} />
                  </Collapse>
                </TableCell>
              </TableRow>
            ) : null,
          ];
        })}
      </TableBody>
    </Table>
  );
}

function GroupRow({
  open,
  onToggle,
  title,
  subtitle,
  stats,
  children,
}) {
  return (
    <>
      <TableRow
        hover
        onClick={onToggle}
        sx={{
          cursor: "pointer",
          bgcolor: open ? alpha("#000", 0.02) : undefined,
        }}
      >
        <TableCell>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <IconButton
              size="small"
              aria-label={open ? "Collapse" : "Expand"}
              onClick={(event) => {
                event.stopPropagation();
                onToggle();
              }}
            >
              {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </IconButton>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography variant="body2" fontWeight={600} noWrap>
                {title}
              </Typography>
              {subtitle && (
                <Typography variant="caption" color="text.secondary">
                  {subtitle}
                </Typography>
              )}
            </Box>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {stats}
            </Stack>
          </Stack>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell sx={{ py: 0, borderBottom: open ? undefined : 0 }}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ py: 1.5, px: 0.5 }}>{children}</Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

export default function AssignmentSubmissionsTable({ rows = [] }) {
  const [groupBy, setGroupBy] = useState("student");
  const [query, setQuery] = useState("");
  const [openGroups, setOpenGroups] = useState(() => new Set());

  const organized = useMemo(() => organizeAssignmentSubmissions(rows), [rows]);
  const filtered = useMemo(
    () => filterOrganizedSubmissions(organized, query),
    [organized, query]
  );

  const toggleGroup = (id) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (rows.length === 0) {
    return (
      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          border: "1px solid",
          borderColor: "divider",
          textAlign: "center",
          py: 6,
        }}
      >
        <Inbox size={40} style={{ opacity: 0.4, marginBottom: 12 }} />
        <Typography color="text.secondary">
          No submissions for this assignment yet
        </Typography>
      </Paper>
    );
  }

  const groups = groupBy === "student" ? filtered.byStudent : filtered.byQuestion;

  return (
    <Stack spacing={2}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1.5}
        alignItems={{ xs: "stretch", sm: "center" }}
        justifyContent="space-between"
      >
        <TextField
          size="small"
          placeholder="Search students…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          sx={{ minWidth: { sm: 240 }, flex: 1, maxWidth: 360 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search size={16} />
              </InputAdornment>
            ),
          }}
        />
        <ToggleButtonGroup
          exclusive
          size="small"
          value={groupBy}
          onChange={(_event, value) => {
            if (value) {
              setGroupBy(value);
              setOpenGroups(new Set());
            }
          }}
        >
          <ToggleButton value="student">By student</ToggleButton>
          <ToggleButton value="question">By question</ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        <Chip size="small" label={`${filtered.summary.studentCount} students`} />
        <Chip size="small" label={`${filtered.summary.questionCount} questions`} />
        <Chip size="small" label={`${filtered.summary.submissionCount} attempts`} />
      </Stack>

      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          border: "1px solid",
          borderColor: "divider",
          overflow: "hidden",
        }}
      >
        {groups.length === 0 ? (
          <Box sx={{ textAlign: "center", py: 5 }}>
            <Typography color="text.secondary">No matching submissions</Typography>
          </Box>
        ) : (
          <Box sx={{ overflowX: "auto", maxHeight: 520, overflowY: "auto" }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>
                    {groupBy === "student" ? "Students" : "Questions"}
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {groupBy === "student"
                  ? filtered.byStudent.map((student) => {
                      const open = openGroups.has(student.userId);
                      return (
                        <GroupRow
                          key={student.userId}
                          open={open}
                          onToggle={() => toggleGroup(student.userId)}
                          title={student.username}
                          subtitle={
                            student.latestSubmittedAt
                              ? `Last activity ${formatEasternFromIso(
                                  new Date(student.latestSubmittedAt).toISOString(),
                                  { includeTime: true }
                                )}`
                              : undefined
                          }
                          stats={[
                            <Chip
                              key="q"
                              size="small"
                              variant="outlined"
                              label={`${student.questionCount} question${student.questionCount === 1 ? "" : "s"}`}
                            />,
                            <Chip
                              key="avg"
                              size="small"
                              variant="outlined"
                              label={
                                student.averageLatestScore != null
                                  ? `Avg ${student.averageLatestScore}`
                                  : "Avg —"
                              }
                            />,
                            <Chip
                              key="ok"
                              size="small"
                              color={
                                student.correctCount === student.questionCount
                                  ? "success"
                                  : "default"
                              }
                              variant="outlined"
                              label={`${student.correctCount}/${student.questionCount} correct`}
                            />,
                          ]}
                        >
                          <DetailRows
                            items={student.questions}
                            labelHeader="Question"
                            getKey={(item) => item.questionId}
                            getTitle={(item) => item.label}
                            getMeta={(item) => {
                              const bits = [
                                `${item.attemptCount} attempt${item.attemptCount === 1 ? "" : "s"}`,
                              ];
                              if (
                                Number.isFinite(item.bestScore) &&
                                item.bestScore !== Number(item.latest?.score)
                              ) {
                                bits.push(`best ${item.bestScore}`);
                              }
                              return bits.join(" · ");
                            }}
                          />
                        </GroupRow>
                      );
                    })
                  : filtered.byQuestion.map((question) => {
                      const open = openGroups.has(question.questionId);
                      return (
                        <GroupRow
                          key={question.questionId}
                          open={open}
                          onToggle={() => toggleGroup(question.questionId)}
                          title={question.label}
                          subtitle={`${question.studentCount} student${question.studentCount === 1 ? "" : "s"} · ${question.attemptCount} attempt${question.attemptCount === 1 ? "" : "s"}`}
                          stats={[
                            <Chip
                              key="avg"
                              size="small"
                              variant="outlined"
                              label={
                                question.averageLatestScore != null
                                  ? `Avg ${question.averageLatestScore}`
                                  : "Avg —"
                              }
                            />,
                            <Chip
                              key="ok"
                              size="small"
                              color={
                                question.correctCount === question.studentCount
                                  ? "success"
                                  : "default"
                              }
                              variant="outlined"
                              label={`${question.correctCount}/${question.studentCount} correct`}
                            />,
                          ]}
                        >
                          <DetailRows
                            items={question.students}
                            labelHeader="Student"
                            getKey={(item) => item.userId}
                            getTitle={(item) => item.username}
                            getMeta={(item) => {
                              const bits = [
                                `${item.attemptCount} attempt${item.attemptCount === 1 ? "" : "s"}`,
                              ];
                              if (
                                Number.isFinite(item.bestScore) &&
                                item.bestScore !== Number(item.latest?.score)
                              ) {
                                bits.push(`best ${item.bestScore}`);
                              }
                              return bits.join(" · ");
                            }}
                          />
                        </GroupRow>
                      );
                    })}
              </TableBody>
            </Table>
          </Box>
        )}
      </Paper>
    </Stack>
  );
}

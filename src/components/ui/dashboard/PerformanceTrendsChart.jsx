import { useState } from "react";
import { Box, Typography, Paper, Stack, useTheme } from "@mui/material";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

const CustomLineTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <Paper
        elevation={8}
        sx={{
          p: 2.5,
          backgroundColor: "background.paper",
          border: "2px solid",
          borderColor: "primary.main",
          borderRadius: 2,
          minWidth: 200,
        }}
      >
        <Typography
          variant="subtitle2"
          fontWeight={700}
          mb={1.5}
          color="primary"
        >
          {data.name}
        </Typography>
        <Stack spacing={1}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Class Average:
            </Typography>
            <Typography
              variant="body2"
              fontWeight={700}
              color={data.average >= 70 ? "success.main" : "error.main"}
            >
              {data.average}%
            </Typography>
          </Box>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Submissions:
            </Typography>
            <Typography variant="body2" fontWeight={600}>
              {data.submissions}/{data.totalStudents}
            </Typography>
          </Box>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Late:
            </Typography>
            <Typography
              variant="body2"
              fontWeight={600}
              color={data.lateSubmissions > 0 ? "warning.main" : "text.primary"}
            >
              {data.lateSubmissions ?? "—"}
            </Typography>
          </Box>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Avg attempts:
            </Typography>
            <Typography variant="body2" fontWeight={600}>
              {data.avgAttempts !== null && data.avgAttempts !== undefined
                ? Number(data.avgAttempts).toFixed(1)
                : "—"}
            </Typography>
          </Box>
        </Stack>
      </Paper>
    );
  }
  return null;
};

export const PerformanceTrendsChart = ({ data, onAssignmentClick }) => {
  const theme = useTheme();
  const primary = theme.palette.primary.main;
  const [hoveredAssignment, setHoveredAssignment] = useState(null);

  return (
    <Paper
      elevation={0}
      sx={{
        height: 420,
        borderRadius: 3,
        border: "1px solid",
        borderColor: "divider",
        transition: "border-color 0.2s",
        "&:hover": {
          borderColor: "primary.main",
        },
      }}
    >
      <Box sx={{ p: 3, pb: 2 }}>
        <Typography variant="h6" fontWeight={600} mb={0.5}>
          Performance Trends
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Click any point to view assignment details
        </Typography>
      </Box>
      <ResponsiveContainer width="100%" height={320}>
        <LineChart
          data={data}
          margin={{ top: 10, right: 30, left: 0, bottom: 40 }}
          onMouseLeave={() => setHoveredAssignment(null)}
        >
          <defs>
            <linearGradient id="colorAverage" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="name"
            interval={0}
            angle={-45}
            textAnchor="end"
            height={80}
            tick={{ fontSize: 10 }}
            stroke="#94a3b8"
            tickFormatter={(value) =>
              value.length > 12 ? value.substring(0, 12) + "..." : value
            }
          />
          <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="#94a3b8" />
          <Tooltip content={<CustomLineTooltip />} />

          <Line
            type="monotone"
            dataKey="average"
            stroke={primary}
            strokeWidth={3}
            fill="url(#colorAverage)"
            dot={(props) => {
              const { cx, cy, payload } = props;
              return (
                <circle
                  cx={cx}
                  cy={cy}
                  r={hoveredAssignment === payload.id ? 8 : 5}
                  fill={payload.average < 70 ? "#ef4444" : primary}
                  stroke="#fff"
                  strokeWidth={2}
                  style={{ cursor: "pointer", transition: "all 0.2s" }}
                  onMouseEnter={() => setHoveredAssignment(payload.id)}
                />
              );
            }}
            activeDot={{
              r: 8,
              cursor: "pointer",
              onClick: (_, data) => onAssignmentClick(data.payload),
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </Paper>
  );
};

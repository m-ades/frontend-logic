import { Box, Typography, Paper, alpha } from "@mui/material";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const CustomBarTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <Paper
        elevation={8}
        sx={{
          p: 2,
          backgroundColor: "background.paper",
          border: "2px solid",
          borderColor: data.color,
          borderRadius: 2,
        }}
      >
        <Typography
          variant="subtitle2"
          fontWeight={700}
          mb={1}
          sx={{ color: data.color }}
        >
          Grade: {data.grade}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Students: <strong>{data.count}</strong>
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Range: <strong>{data.range}</strong>
        </Typography>
      </Paper>
    );
  }
  return null;
};

export const GradeDistributionChart = ({ data }) => (
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
        Grade Distribution
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Hover bars for detailed breakdown
      </Typography>
    </Box>
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="grade" tick={{ fontSize: 12 }} stroke="#94a3b8" />
        <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
        <Tooltip
          content={<CustomBarTooltip />}
          cursor={{ fill: alpha("#3b82f6", 0.1) }}
        />
        <Bar dataKey="count" radius={[8, 8, 0, 0]} animationDuration={800}>
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.color}
              style={{ transition: "opacity 0.2s" }}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  </Paper>
);

import { Box, Typography, Paper, Stack } from "@mui/material";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import { TrendingUp, Users, CheckCircle } from "lucide-react";

// Mock data - replace with actual data from your context/API
const mockAssignments = [
  {
    id: 1,
    name: "Assignment 1",
    average: 87,
    submissions: 28,
    total: 30,
    late: 3,
  },
  {
    id: 2,
    name: "Assignment 2",
    average: 82,
    submissions: 29,
    total: 30,
    late: 5,
  },
  {
    id: 3,
    name: "Assignment 3",
    average: 90,
    submissions: 27,
    total: 30,
    late: 2,
  },
  {
    id: 4,
    name: "Assignment 4",
    average: 78,
    submissions: 30,
    total: 30,
    late: 7,
  },
  {
    id: 5,
    name: "Assignment 5",
    average: 85,
    submissions: 26,
    total: 30,
    late: 4,
  },
  {
    id: 6,
    name: "Assignment 6",
    average: 92,
    submissions: 28,
    total: 30,
    late: 1,
  },
];

const gradeDistribution = [
  { grade: "A (90-100)", count: 8 },
  { grade: "B (80-89)", count: 12 },
  { grade: "C (70-79)", count: 6 },
  { grade: "D (60-69)", count: 3 },
  { grade: "F (0-59)", count: 1 },
];

// Calculate overall statistics
const totalAverage = Math.round(
  mockAssignments.reduce((sum, a) => sum + a.average, 0) /
    mockAssignments.length
);
const totalSubmissions = mockAssignments.reduce(
  (sum, a) => sum + a.submissions,
  0
);
const totalPossible = mockAssignments.reduce((sum, a) => sum + a.total, 0);
const completionRate = Math.round((totalSubmissions / totalPossible) * 100);

// Metric card component for displaying key statistics
const MetricCard = ({ title, value, subtitle, icon: Icon, color }) => (
  <Paper
    elevation={2}
    sx={{
      p: 3,
      height: "100%",
      borderLeft: `4px solid ${color}`,
      background: `linear-gradient(135deg, ${color}15, ${color}05)`,
    }}
  >
    <Stack spacing={1}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, color }}>
        <Icon size={20} />
        <Typography
          variant="caption"
          fontWeight={600}
          textTransform="uppercase"
        >
          {title}
        </Typography>
      </Box>
      <Typography variant="h3" fontWeight={700} color={color}>
        {value}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {subtitle}
      </Typography>
    </Stack>
  </Paper>
);

// Custom tooltip for the line chart
const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <Paper
        elevation={3}
        sx={{
          p: 2,
          backgroundColor: "background.paper",
          border: "1px solid",
          borderColor: "divider",
        }}
      >
        <Typography variant="subtitle2" fontWeight={600} mb={1}>
          {data.name}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Average: <strong>{data.average}%</strong>
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Submissions:{" "}
          <strong>
            {data.submissions}/{data.total}
          </strong>
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Late: <strong>{data.late}</strong>
        </Typography>
        <Typography
          variant="caption"
          sx={{ mt: 1, display: "block", fontStyle: "italic" }}
        >
          Click to view details
        </Typography>
      </Paper>
    );
  }
  return null;
};

export default function InstructorDashboard() {
  const handleAssignmentClick = (data) => {
    console.log("Navigate to assignment:", data.id);
    // TODO: Replace with router navigation
    // navigate(`/instructor/assignment/${data.id}`)
    alert(`Navigate to ${data.name} (ID: ${data.id})`);
  };

  return (
    <Box sx={{ width: "100%" }}>
      <Typography variant="h4" fontWeight={600} mb={3}>
        Dashboard
      </Typography>

      {/* Key metric cards - responsive grid layout */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "1fr 1fr",
            lg: "1fr 1fr 1fr",
          },
          gap: 3,
          mb: 4,
        }}
      >
        <MetricCard
          title="Class Average"
          value={`${totalAverage}%`}
          subtitle="Across all assignments"
          icon={TrendingUp}
          color="#4caf50"
        />
        <MetricCard
          title="Completion Rate"
          value={`${completionRate}%`}
          subtitle={`${totalSubmissions} of ${totalPossible} submitted`}
          icon={CheckCircle}
          color="#2196f3"
        />
        <MetricCard
          title="Total Students"
          value="30"
          subtitle="Enrolled in course"
          icon={Users}
          color="#9c27b0"
        />
      </Box>

      {/* Charts section - responsive grid layout */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" },
          gap: 3,
        }}
      >
        {/* Assignment Performance Line Chart */}
        <Paper elevation={2} sx={{ height: 420 }}>
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight={600}>
              Assignment Performance Trends
            </Typography>
          </Box>
          <ResponsiveContainer width="100%" height={330}>
            <LineChart
              data={mockAssignments}
              margin={{ top: 20, right: 30, left: 10, bottom: 40 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis
                dataKey="name"
                interval={0}
                padding={{ left: 20, right: 20 }}
                tick={{ fontSize: 12 }}
                stroke="#666"
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 12 }}
                width={40}
                stroke="#666"
                label={{
                  value: "Average (%)",
                  angle: -90,
                  position: "insideLeft",
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="average"
                stroke="#1976d2"
                strokeWidth={3}
                dot={{ fill: "#1976d2", r: 6, cursor: "pointer" }}
                activeDot={{
                  r: 8,
                  cursor: "pointer",
                  onClick: (_, data) => handleAssignmentClick(data.payload),
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Paper>

        {/* Grade Distribution Bar Chart */}
        <Paper elevation={2} sx={{ height: 420 }}>
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight={600}>
              Grade Distribution
            </Typography>
          </Box>
          <ResponsiveContainer width="100%" height={330}>
            <BarChart data={gradeDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis dataKey="grade" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                {gradeDistribution.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      ["#4caf50", "#8bc34a", "#ffc107", "#ff9800", "#f44336"][
                        index
                      ]
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Paper>
      </Box>
    </Box>
  );
}

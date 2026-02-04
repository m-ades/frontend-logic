import { Box, useTheme } from "@mui/material";
import { MetricCard } from "../MetricCard";
import { Users, TrendingUp, AlertTriangle } from "lucide-react";

export default function RosterStatsSection({
  totalStudents,
  averageGrade,
  studentsAtRisk,
  courseCode,
}) {
  const theme = useTheme();
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
        gap: 2,
        mb: 3,
      }}
    >
      <MetricCard
        title="Total Students"
        value={totalStudents}
        subtitle={`${courseCode} enrolled`}
        icon={Users}
        gradient={[theme.palette.primary.main, theme.palette.primary.dark]}
      />

      <MetricCard
        title="Class Average"
        value={`${averageGrade}%`}
        subtitle="Across all students"
        icon={TrendingUp}
        gradient={["#22c55e", "#16a34a"]}
      />

      <MetricCard
        title="Students At Risk"
        value={studentsAtRisk}
        subtitle="Below 70% average"
        icon={AlertTriangle}
        gradient={["#f97316", "#ea580c"]}
      />
    </Box>
  );
}

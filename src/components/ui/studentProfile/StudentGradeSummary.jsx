import { Box, Chip, Grid, Paper, Stack, Typography, alpha, useTheme } from "@mui/material";
import { Award, Clock, TrendingDown, TrendingUp } from "lucide-react";
import { formatNumber } from "../../../utils/numberUtils.js";
import { getLetterGrade } from "../../../utils/gradingUtils";
import { MetricCard } from "../MetricCard";

export default function StudentGradeSummary({
  average,
  averageGrade,
  completedAssignments,
  completionRate,
  gradingScale,
  highestGrade,
  lowestGrade,
  missingAssignments,
  totalAssignments,
}) {
  const theme = useTheme();
  const summaryRows = [
    {
      label: "Completion Rate",
      value: `${formatNumber(completionRate)}% (${completedAssignments}/${totalAssignments})`,
    },
    { label: "Highest Grade", value: `${formatNumber(highestGrade)}%`, color: "success.main" },
    { label: "Lowest Grade", value: `${formatNumber(lowestGrade)}%`, color: "error.main" },
  ];

  return (
    <>
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 3,
          background: `linear-gradient(135deg, ${alpha(
            theme.palette.primary.main,
            0.1
          )} 0%, ${alpha(theme.palette.secondary?.main || "#8b5cf6", 0.1)} 100%)`,
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 2,
        }}
      >
        <Grid container spacing={2} alignItems="center">
          <Grid size={{ xs: 12, md: 6 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              OVERALL GRADE
            </Typography>
            <Box sx={{ display: "flex", alignItems: "baseline", gap: 2, mt: 1 }}>
              <Typography variant="h2" component="div" fontWeight={800} color="primary.main">
                {average === null ? "—" : `${formatNumber(average)}%`}
              </Typography>
              <Chip
                label={averageGrade.letter}
                color={averageGrade.chipColor}
                sx={{
                  fontWeight: 700,
                  fontSize: "1rem",
                  height: 32,
                  ...averageGrade.chipSx,
                }}
              />
            </Box>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Stack spacing={1.5}>
              {summaryRows.map((row) => (
                <Box key={row.label} sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography variant="body2" color="text.secondary">
                    {row.label}
                  </Typography>
                  <Typography variant="body2" fontWeight={600} color={row.color}>
                    {row.value}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Grid>
        </Grid>
      </Paper>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr 1fr",
            md: "repeat(4, 1fr)",
          },
          gap: 2,
          mb: 3,
        }}
      >
        <MetricCard
          title="Completed"
          value={completedAssignments}
          subtitle={`${formatNumber(completionRate)}% of total`}
          icon={Award}
          gradient={["#10b981", "#059669"]}
        />
        <MetricCard
          title="Missing"
          value={missingAssignments}
          subtitle={missingAssignments === 0 ? "All done" : "Assignments due"}
          icon={Clock}
          gradient={["#ef4444", "#dc2626"]}
        />
        <MetricCard
          title="Highest"
          value={`${formatNumber(highestGrade)}%`}
          subtitle={getLetterGrade(highestGrade, gradingScale)}
          icon={TrendingUp}
          gradient={[theme.palette.primary.main, theme.palette.primary.dark]}
        />
        <MetricCard
          title="Lowest"
          value={`${formatNumber(lowestGrade)}%`}
          subtitle={getLetterGrade(lowestGrade, gradingScale)}
          icon={TrendingDown}
          gradient={["#f59e0b", "#d97706"]}
        />
      </Box>
    </>
  );
}

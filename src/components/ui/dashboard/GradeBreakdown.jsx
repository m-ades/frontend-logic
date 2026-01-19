import { Paper, Typography, Stack, Box, LinearProgress } from "@mui/material";
import { alpha } from "@mui/material/styles";

export default function GradeBreakdown({ data, total }) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        borderRadius: 3,
        border: "1px solid",
        borderColor: "divider",
      }}
    >
      <Typography variant="h6" fontWeight={600} mb={2}>
        Grade Breakdown
      </Typography>

      <Stack spacing={2}>
        {data.map((item) => {
          const percentage =
            total > 0 ? Math.round((item.count / total) * 100) : 0;

          return (
            <Box key={item.grade}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  mb: 1,
                }}
              >
                <Typography fontWeight={600}>
                  {item.grade} ({item.range})
                </Typography>
                <Typography color="text.secondary">
                  {item.count} students ({percentage}%)
                </Typography>
              </Box>

              <LinearProgress
                variant="determinate"
                value={percentage}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: alpha(item.color, 0.1),
                  "& .MuiLinearProgress-bar": {
                    backgroundColor: item.color,
                    borderRadius: 4,
                  },
                }}
              />
            </Box>
          );
        })}
      </Stack>
    </Paper>
  );
}

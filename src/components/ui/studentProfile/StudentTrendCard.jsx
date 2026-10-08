import { Box, Paper, Typography, alpha } from "@mui/material";
import { CheckCircle, TrendingDown, TrendingUp } from "lucide-react";

const trendDisplay = {
  improving: {
    icon: TrendingUp,
    color: "#10b981",
    textColor: "success.main",
    title: "Performance Improving",
    subtitle: "Recent grades show positive trend",
  },
  declining: {
    icon: TrendingDown,
    color: "#ef4444",
    textColor: "error.main",
    title: "Performance Declining",
    subtitle: "Recent grades show downward trend",
  },
  stable: {
    icon: CheckCircle,
    color: "#64748b",
    textColor: "text.secondary",
    title: "Performance Stable",
    subtitle: "Consistent performance across recent assignments",
  },
};

export default function StudentTrendCard({ trend }) {
  const display = trendDisplay[trend];
  if (!display) return null;
  const Icon = display.icon;
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        mb: 3,
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 2,
        display: "flex",
        alignItems: "center",
        gap: 2,
      }}
    >
      <Box
        sx={{
          width: 48,
          height: 48,
          borderRadius: 2,
          background: alpha(display.color, 0.1),
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon size={24} color={display.color} />
      </Box>
      <Box sx={{ flex: 1 }}>
        <Typography variant="body1" fontWeight={700} color={display.textColor}>
          {display.title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {display.subtitle}
        </Typography>
      </Box>
    </Paper>
  );
}

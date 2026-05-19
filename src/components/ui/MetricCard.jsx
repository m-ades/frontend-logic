import { Box, Typography, Paper, Stack } from "@mui/material";

export const MetricCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  gradient,
  trend,
}) => (
  <Paper
    elevation={0}
    sx={{
      p: 3,
      height: "100%",
      background: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})`,
      borderRadius: 3,
      position: "relative",
      overflow: "hidden",
      transition: "transform 0.2s",
      "&:hover": {
        transform: "translateY(-4px)",
      },
    }}
  >
    <Stack spacing={2}>
      <Box
        sx={{
          width: 48,
          height: 48,
          borderRadius: 2,
          background: "rgba(255, 255, 255, 0.2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon size={24} color="#fff" strokeWidth={2.5} />
      </Box>
      <Box>
        <Typography
          variant="h3"
          component="div"
          fontWeight={700}
          sx={{ color: "#fff", mb: 0.5, lineHeight: 1 }}
        >
          {value}
        </Typography>
        <Typography
          variant="body2"
          sx={{ color: "rgba(255, 255, 255, 0.95)", fontWeight: 500 }}
        >
          {title}
        </Typography>
        <Typography
          variant="caption"
          sx={{ color: "rgba(255, 255, 255, 0.75)", display: "block", mt: 0.5 }}
        >
          {subtitle}
        </Typography>
      </Box>
    </Stack>
  </Paper>
);

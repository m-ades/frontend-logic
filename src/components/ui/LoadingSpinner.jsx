import { Box, Typography, LinearProgress } from "@mui/material";

export default function LoadingSpinner({ label = "Loading..." }) {
  return (
    <Box
      sx={{
        py: 3,
        px: 2,
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        gap: 2,
        maxWidth: 320,
        mx: "auto",
      }}
    >
      <LinearProgress aria-label={label} />
      {label && (
        <Typography variant="body2" color="text.secondary" textAlign="center">
          {label}
        </Typography>
      )}
    </Box>
  );
}

import { Box, Typography } from "@mui/material";

const sizeMap = {
  sm: 10,
  md: 14,
  lg: 18,
};

export default function LoadingSpinner({ label = "Loading...", size = "md" }) {
  const fontSize = Number.isFinite(size) ? size : sizeMap[size] || sizeMap.md;

  return (
    <Box
      sx={{
        py: 3,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 2,
      }}
    >
      <div
        className="wheel-and-hamster"
        role="img"
        aria-label={label}
        style={{ fontSize }}
      >
        <div className="wheel" />
        <div className="hamster">
          <div className="hamster__head">
            <div className="hamster__ear" />
            <div className="hamster__eye" />
            <div className="hamster__nose" />
          </div>
          <div className="hamster__body">
            <div className="hamster__limb--fr" />
            <div className="hamster__limb--fl" />
            <div className="hamster__limb--br" />
            <div className="hamster__limb--bl" />
            <div className="hamster__tail" />
          </div>
        </div>
        <div className="spoke" />
      </div>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
    </Box>
  );
}

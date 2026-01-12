import { Card, CardContent, Box, Skeleton, Stack } from "@mui/material";

export default function CourseCardSkeleton() {
  return (
    <Card sx={{ height: "100%" }}>
      <CardContent>
        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2, mb: 2 }}>
          <Skeleton variant="circular" width={56} height={56} />
          <Box sx={{ flexGrow: 1 }}>
            <Skeleton variant="text" width="60%" height={32} />
            <Skeleton variant="text" width="80%" />
            <Skeleton variant="rounded" width={60} height={24} sx={{ mt: 1 }} />
          </Box>
        </Box>
        <Stack spacing={1.5} sx={{ mt: 3 }}>
          <Skeleton variant="text" width="70%" />
          <Skeleton variant="text" width="50%" />
        </Stack>
      </CardContent>
    </Card>
  );
}

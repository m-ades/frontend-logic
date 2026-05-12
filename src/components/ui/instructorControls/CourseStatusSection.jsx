import { Box, Typography, CardContent, Divider } from "@mui/material";
import ThemedCard from "../../../components/ui/ThemedCard.jsx";
import ArchiveCourseSection from "./ArchiveCourseSection";

export default function CourseStatusSection({ course, onArchive }) {
  return (
    <ThemedCard sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" component="h2" fontWeight={600} mb={2}>
          Course Status
        </Typography>
        <Divider sx={{ mb: 3 }} />

        <ArchiveCourseSection course={course} onArchive={onArchive} />
      </CardContent>
    </ThemedCard>
  );
}

/**
 * Default letter-grade bands (percent min/max). Shared by course defaults and
 * analytics rollups so scale and distribution logic stay aligned.
 */
export const DEFAULT_GRADING_SCALE = [
  { letter: "A", minPercent: 90, maxPercent: 100, color: "#10b981" },
  { letter: "B", minPercent: 80, maxPercent: 89, color: "#6366f1" },
  { letter: "C", minPercent: 70, maxPercent: 79, color: "#f59e0b" },
  { letter: "D", minPercent: 60, maxPercent: 69, color: "#f97316" },
  { letter: "F", minPercent: 0, maxPercent: 59, color: "#ef4444" },
];

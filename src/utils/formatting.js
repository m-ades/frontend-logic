// date
import { formatEasternFromIso, toEasternIso } from "./easternTime.js";

export function formatDate(dateString, fallback = "No due date") {
  if (!dateString) return fallback;
  const iso = dateString.includes("T") ? dateString : toEasternIso(dateString);
  const formatted = iso
    ? formatEasternFromIso(iso, { includeTime: false })
    : null;
  return formatted || fallback;
}

export function formatDateTime(dateString) {
  if (!dateString) return null;
  const hasTimeInfo = dateString.includes("T");
  const iso = hasTimeInfo ? dateString : toEasternIso(dateString);
  return iso
    ? formatEasternFromIso(iso, { includeTime: hasTimeInfo })
    : null;
}

// TODO: duration for problem sets (~40 mins), points for assignments

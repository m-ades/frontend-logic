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

// rounds to whole minutes like "45 min" or "1 hr 5 min"
export function formatMinutes(value) {
  const minutes = Math.round(value);
  if (minutes < 1) return "<1 min";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!hours) return `${minutes} min`;
  return rest ? `${hours} hr ${rest} min` : `${hours} hr`;
}

// TODO: duration for problem sets (~40 mins), points for assignments

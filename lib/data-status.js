export function refreshAge(timestamp, now = Date.now()) {
  const time = timestamp ? Date.parse(timestamp) : NaN;
  if (!Number.isFinite(time) || time > now) return "Refresh age unavailable";
  const days = Math.floor((now - time) / 86400000);
  return days > 14 ? "Last refresh over 14 days ago" : days > 8 ? "Refresh overdue (over 8 days)" : "Recently refreshed";
}

export function formatUtc(timestamp) {
  const time = timestamp ? Date.parse(timestamp) : NaN;
  return Number.isFinite(time) ? new Date(time).toISOString().replace("T", " ").slice(0, 19) + " UTC" : "Unavailable";
}

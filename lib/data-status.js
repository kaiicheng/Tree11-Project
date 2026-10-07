export function refreshAge(timestamp, now = Date.now()) {
  const time = parseUtcTimestamp(timestamp);
  if (!Number.isFinite(time) || time > now) return "Refresh age unavailable";
  const days = Math.floor((now - time) / 86400000);
  return days > 14 ? "Last refresh over 14 days ago" : days > 8 ? "Refresh overdue (over 8 days)" : "Recently refreshed";
}

export function formatUtc(timestamp) {
  const time = parseUtcTimestamp(timestamp);
  return Number.isFinite(time) ? new Date(time).toISOString().replace("T", " ").slice(0, 19) + " UTC" : "Unavailable";
}

export function formatUtcDate(timestamp) {
  const time = parseUtcTimestamp(timestamp);
  if (!Number.isFinite(time)) return "Unavailable";

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(time));
}

function parseUtcTimestamp(timestamp) {
  if (!timestamp || typeof timestamp !== "string") return NaN;
  const normalized = /(?:Z|[+-]\d{2}:?\d{2})$/.test(timestamp) ? timestamp : `${timestamp}Z`;
  return Date.parse(normalized);
}

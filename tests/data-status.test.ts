import { test } from "node:test";
import assert from "node:assert/strict";
import { refreshAge, formatUtc, formatUtcDate } from "../lib/data-status.js";

test("refresh age handles missing, malformed, future and overdue timestamps", () => {
  const now = Date.parse("2026-09-06T00:00:00Z");
  for (const value of [undefined, "invalid", "2026-09-07"]) {
    assert.equal(refreshAge(value, now), "Refresh age unavailable");
  }
  assert.equal(refreshAge("2026-09-06", now), "Recently refreshed");
  assert.equal(refreshAge("2026-08-28", now), "Refresh overdue (over 8 days)");
  assert.equal(refreshAge("2026-01-04", now), "Last refresh over 14 days ago");
});

test("coverage dates remain in UTC regardless of browser timezone", () => {
  assert.equal(formatUtc("2026-01-04T00:00:00+00:00"), "2026-01-04 00:00:00 UTC");
  assert.equal(formatUtc("2026-01-04T00:00:00"), "2026-01-04 00:00:00 UTC");
  assert.equal(formatUtcDate("2026-09-27T23:23:25.000"), "Sep 27, 2026, 11:23 PM");
  assert.equal(formatUtc("invalid"), "Unavailable");
  assert.equal(formatUtcDate("invalid"), "Unavailable");
});

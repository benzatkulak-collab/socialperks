// Query-window parsing for the partner API. Counting is [from, to).

const MAX_WINDOW_MS = 31 * 24 * 60 * 60 * 1000;
// ISO-8601 instant: date, time, and an explicit zone (Z or an offset).
const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;

function parseInstant(value: string | null): Date | null {
  if (!value || !ISO_INSTANT.test(value)) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function parseWindow(
  from: string | null,
  to: string | null,
): { ok: true; from: Date; to: Date } | { ok: false; message: string } {
  const f = parseInstant(from);
  const t = parseInstant(to);
  if (!f || !t) {
    return { ok: false, message: "`from` and `to` are required ISO-8601 instants with a time zone, e.g. 2026-11-19T05:00:00Z." };
  }
  if (t.getTime() <= f.getTime()) return { ok: false, message: "`to` must be after `from`." };
  if (t.getTime() - f.getTime() > MAX_WINDOW_MS) return { ok: false, message: "The window may be at most 31 days." };
  return { ok: true, from: f, to: t };
}

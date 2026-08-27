const DAY_MS = 86_400_000;

function pad2(value: number): string {
  return value.toString().padStart(2, "0");
}

function toDateOnly(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

/**
 * Treats `anchorIso` as a recurring monthly due day (the day it was last
 * paid/set), and rolls it forward to the next occurrence on or after today.
 */
export function nextOccurrenceDate(anchorIso: string, now: Date = new Date()): string {
  const anchorDay = Number(anchorIso.slice(8, 10));
  const today = toDateOnly(now);

  let year = today.getFullYear();
  let month = today.getMonth();

  const candidateFor = (y: number, m: number) =>
    new Date(y, m, Math.min(anchorDay, daysInMonth(y, m)));

  let candidate = candidateFor(year, month);
  if (candidate < today) {
    month += 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
    candidate = candidateFor(year, month);
  }

  return `${candidate.getFullYear()}-${pad2(candidate.getMonth() + 1)}-${pad2(candidate.getDate())}`;
}

export function daysUntil(iso: string, now: Date = new Date()): number {
  const [y, m, d] = iso.split("-").map(Number);
  const target = new Date(y, m - 1, d);
  const today = toDateOnly(now);
  return Math.round((target.getTime() - today.getTime()) / DAY_MS);
}

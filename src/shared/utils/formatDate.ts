const DATE_FMT = new Intl.DateTimeFormat('en-PH', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
});

const TIME_FMT = new Intl.DateTimeFormat('en-PH', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: true,
});

const DATETIME_FMT = new Intl.DateTimeFormat('en-PH', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: true,
});

export const formatDate = (d: Date): string => DATE_FMT.format(d);
export const formatTime = (d: Date): string => TIME_FMT.format(d);
export const formatDateTime = (d: Date): string => DATETIME_FMT.format(d);

/** Returns { start, end } for the start and end of the calendar day containing `d`. */
export function dayBounds(d: Date): { start: Date; end: Date } {
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
  return { start, end };
}

/** Returns bounds of the ISO week (Mon–Sun) containing `d`. */
export function weekBounds(d: Date): { start: Date; end: Date } {
  const day = d.getDay(); // 0=Sun, 1=Mon…
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { start: monday, end: sunday };
}

/** Returns bounds of the calendar month containing `d`. */
export function monthBounds(d: Date): { start: Date; end: Date } {
  const start = new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

/** Returns an array of the last N calendar days, newest first. */
export function lastNDays(n: number): Date[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d;
  });
}

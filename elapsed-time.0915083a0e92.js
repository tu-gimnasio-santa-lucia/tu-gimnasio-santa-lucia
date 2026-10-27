/** Shared calendar/elapsed-time calculation. Midnight is a convention, not a known opening hour. */
const argentinaCalendar = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Argentina/Buenos_Aires',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
export function calculateElapsed(foundedDate, now = new Date()) {
  const start = new Date(`${foundedDate}T00:00:00-03:00`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(foundedDate) ||
    !Number.isFinite(start.getTime()) ||
    start.toISOString().slice(0, 10) !== foundedDate ||
    !Number.isFinite(now.getTime())
  )
    throw new Error('Fecha de fundación o reloj inválidos.');
  const parts = Object.fromEntries(
    argentinaCalendar
      .formatToParts(now)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, Number(part.value)]),
  );
  const [year, month, day] = foundedDate.split('-').map(Number);
  const years = Math.max(
    0,
    parts.year - year - (parts.month < month || (parts.month === month && parts.day < day) ? 1 : 0),
  );
  const seconds = Math.max(0, Math.floor((now.getTime() - start.getTime()) / 1000));
  return {
    years,
    currentYear: parts.year,
    days: Math.floor(seconds / 86400),
    hours: Math.floor(seconds / 3600),
    minutes: Math.floor(seconds / 60),
    seconds,
  };
}

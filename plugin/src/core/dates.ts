// Format a Date as YYYY-MM-DD using the local calendar. Date.toISOString()
// formats in UTC, which rolls the calendar date forward or back for users in
// non-UTC zones (e.g. UTC+7 late in the evening), mis-stamping created_at and
// updated_at by a day.
export function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

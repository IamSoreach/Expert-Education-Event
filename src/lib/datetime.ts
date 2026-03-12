export const PHNOM_PENH_TIMEZONE = "Asia/Phnom_Penh";

export function formatDateTimePhnomPenh(value: Date | string | null | undefined): string {
  if (!value) {
    return "-";
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: PHNOM_PENH_TIMEZONE,
  }).format(date);
}

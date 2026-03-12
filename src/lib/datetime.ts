export const PHNOM_PENH_TIMEZONE = "Asia/Phnom_Penh";
export const PHNOM_PENH_TIMEZONE_LABEL = "GMT+7";

const phnomPenhDateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: PHNOM_PENH_TIMEZONE,
});

export function formatDateTimePhnomPenh(value: Date | string | null | undefined): string {
  if (!value) {
    return "-";
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return `${phnomPenhDateTimeFormatter.format(date)} ${PHNOM_PENH_TIMEZONE_LABEL}`;
}

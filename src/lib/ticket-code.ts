const RAW_TICKET_CODE_REGEX = /^[A-Z0-9]{12,64}$/;

export function normalizeRawTicketCode(input: string): string | null {
  const normalized = input.trim().toUpperCase();
  if (!RAW_TICKET_CODE_REGEX.test(normalized)) {
    return null;
  }
  return normalized;
}

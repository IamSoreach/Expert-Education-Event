export function normalizePhoneNumber(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) {
    return "";
  }

  const hasLeadingPlus = trimmed.startsWith("+");
  let digits = trimmed.replace(/\D/g, "");

  // Common international dialing prefix normalization.
  if (!hasLeadingPlus && digits.startsWith("00")) {
    digits = digits.slice(2);
    return digits ? `+${digits}` : "";
  }

  if (hasLeadingPlus) {
    return digits ? `+${digits}` : "";
  }

  return digits;
}

export function isReasonablePhoneNumber(normalized: string): boolean {
  if (!normalized) {
    return false;
  }

  if (normalized.startsWith("+")) {
    const digits = normalized.slice(1);
    return /^\d{8,15}$/.test(digits);
  }

  return /^\d{7,15}$/.test(normalized);
}

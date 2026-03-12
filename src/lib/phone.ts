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

function uniqueNonEmpty(values: string[]): string[] {
  return Array.from(
    new Set(
      values
        .map((value) => value.trim())
        .filter((value) => value.length > 0),
    ),
  );
}

// Build equivalent lookup candidates so ticket lookup can match both local (0xx...)
// and international (+855...) formats for the same phone number.
export function buildPhoneLookupCandidates(input: string): string[] {
  const normalized = normalizePhoneNumber(input);
  if (!normalized) {
    return [];
  }

  const raw = normalized.startsWith("+") ? normalized.slice(1) : normalized;
  const candidates = [normalized, raw];

  if (raw.startsWith("855") && raw.length > 3) {
    const local = `0${raw.slice(3)}`;
    candidates.push(`+${raw}`, local);
  } else if (raw.startsWith("0") && raw.length > 1) {
    const internationalRaw = `855${raw.slice(1)}`;
    candidates.push(`+${internationalRaw}`, internationalRaw);
  }

  return uniqueNonEmpty(candidates);
}

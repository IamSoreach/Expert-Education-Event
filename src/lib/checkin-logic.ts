export type ImmediateScanResult = "REVOKED" | "DUPLICATE" | "CANDIDATE_VALID";

export function getImmediateScanResult(state: {
  revokedAt: Date | null;
  checkedInAt: Date | null;
}): ImmediateScanResult {
  if (state.revokedAt) {
    return "REVOKED";
  }

  if (state.checkedInAt) {
    return "DUPLICATE";
  }

  return "CANDIDATE_VALID";
}

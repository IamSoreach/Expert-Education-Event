import { Prisma } from "@prisma/client";

export function buildParticipantDedupWhere(
  phoneNumber: string,
  email: string | null,
): Prisma.ParticipantWhereInput {
  if (email) {
    return {
      OR: [{ phoneNumber }, { email }],
    };
  }

  return {
    phoneNumber,
  };
}

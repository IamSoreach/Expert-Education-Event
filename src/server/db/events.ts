import { prisma } from "@/server/db/client";

type UpsertSampleEventInput = {
  code: string;
  name: string;
  description?: string;
  venue?: string;
  startAt: Date;
  endAt?: Date;
};

export async function upsertEventByCode(input: UpsertSampleEventInput) {
  return prisma.event.upsert({
    where: {
      code: input.code,
    },
    update: {
      name: input.name,
      description: input.description,
      venue: input.venue,
      startAt: input.startAt,
      endAt: input.endAt ?? null,
      isActive: true,
    },
    create: {
      code: input.code,
      name: input.name,
      description: input.description,
      venue: input.venue,
      startAt: input.startAt,
      endAt: input.endAt ?? null,
      isActive: true,
    },
  });
}

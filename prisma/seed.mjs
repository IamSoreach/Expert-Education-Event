import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const eventName = process.env.EVENT_NAME || "Sample Event";
  const eventCode = process.env.EVENT_CODE || "sample-event";

  // Business rule: event code is the stable public identifier used in links.
  const event = await prisma.event.upsert({
    where: {
      code: eventCode,
    },
    update: {
      name: eventName,
      isActive: true,
    },
    create: {
      code: eventCode,
      name: eventName,
      description: "Seeded sample event for local MVP development.",
      startAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      isActive: true,
    },
  });

  console.log(
    `Seed complete. Event created/updated: id=${event.id}, code=${event.code}, name=${event.name}`,
  );
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import { z } from "zod";

import { getEnv } from "@/lib/env";
import { errorJson, noStoreHeaders } from "@/lib/http";
import { createRequestId, logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { verifyTelegramWebAppInitData } from "@/lib/telegram-webapp";

const miniAppProfileRequestSchema = z.object({
  telegramWebAppInitData: z.string().trim().min(10).max(4096),
});

function buildTelegramName(user: {
  first_name?: string;
  last_name?: string;
}): string | null {
  const name = [user.first_name, user.last_name].filter(Boolean).join(" ").trim();
  return name || null;
}

export async function POST(req: Request): Promise<Response> {
  const requestId = createRequestId();
  const headers = noStoreHeaders({ "x-request-id": requestId });

  try {
    const payload = await req.json();
    const parsed = miniAppProfileRequestSchema.safeParse(payload);
    if (!parsed.success) {
      return errorJson("Invalid Telegram Mini App payload.", 400, parsed.error.flatten(), headers);
    }

    const env = getEnv();
    const verified = verifyTelegramWebAppInitData(
      parsed.data.telegramWebAppInitData,
      env.TELEGRAM_BOT_TOKEN,
      env.TELEGRAM_WEBAPP_AUTH_MAX_AGE_SECONDS,
    );

    if (!verified?.user?.id) {
      return errorJson("Telegram session could not be verified.", 401, undefined, headers);
    }

    const telegramUserId = String(verified.user.id);
    const participant = await prisma.participant.findUnique({
      where: {
        telegramUserId,
      },
      select: {
        fullName: true,
        phoneNumber: true,
      },
    });

    return Response.json(
      {
        fullName: participant?.fullName ?? buildTelegramName(verified.user),
        phoneNumber: participant?.phoneNumber ?? null,
      },
      { headers },
    );
  } catch (error) {
    logger.error("mini_app_profile_fetch_failed", {
      requestId,
      error: error instanceof Error ? error.message : String(error),
    });
    return errorJson("Unable to fetch Mini App profile.", 500, undefined, headers);
  }
}

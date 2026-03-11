import { redirect } from "next/navigation";

import { getEnv } from "@/lib/env";

export default function TelegramTicketLookupIndexPage(): never {
  const env = getEnv();
  redirect(`/telegram/check-in/${encodeURIComponent(env.EVENT_CODE)}`);
}

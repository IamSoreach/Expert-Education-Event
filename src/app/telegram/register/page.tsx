import { redirect } from "next/navigation";

import { getEnv } from "@/lib/env";

export default function TelegramRegisterIndexPage(): never {
  const env = getEnv();
  redirect(`/telegram/register/${encodeURIComponent(env.EVENT_CODE)}`);
}

import { redirect } from "next/navigation";

import { getEnv } from "@/lib/env";

export default function RegisterIndexPage(): never {
  const env = getEnv();
  redirect(`/register/${encodeURIComponent(env.EVENT_CODE)}`);
}

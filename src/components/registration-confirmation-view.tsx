import Link from "next/link";

import { RegistrationConfirmationStatus } from "@/components/registration-confirmation-status";
import { buildTelegramDeepLink } from "@/lib/telegram";
import { registrationStatusQuerySchema } from "@/lib/validation/registration";
import { getRegistrationStatusView } from "@/server/registration-flow";

type RegistrationConfirmationViewProps = {
  eventCode: string;
  registrationId?: string;
  token?: string;
  duplicate?: boolean;
  backPathPrefix: "/register" | "/telegram/register";
};

export async function RegistrationConfirmationView({
  eventCode,
  registrationId,
  token,
  duplicate = false,
  backPathPrefix,
}: RegistrationConfirmationViewProps) {
  const parsed = registrationStatusQuerySchema.safeParse({
    registrationId: registrationId ?? "",
    token: token ?? "",
  });

  if (!parsed.success) {
    return (
      <section className="px-4 py-12">
        <div className="mx-auto max-w-2xl rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-900 shadow-sm">
          <h1 className="text-2xl font-semibold">Missing confirmation data</h1>
          <p className="mt-2 text-sm">Please submit the registration form again.</p>
          <Link
            href={`${backPathPrefix}/${encodeURIComponent(eventCode)}`}
            className="mt-5 inline-flex rounded-xl border border-rose-300 px-4 py-2.5 text-sm font-medium hover:bg-rose-100"
          >
            Back to registration
          </Link>
        </div>
      </section>
    );
  }

  const statusView = await getRegistrationStatusView(
    parsed.data.registrationId,
    parsed.data.token,
  );

  if (!statusView || statusView.eventCode !== eventCode) {
    return (
      <section className="px-4 py-12">
        <div className="mx-auto max-w-2xl rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-900 shadow-sm">
          <h1 className="text-2xl font-semibold">Registration not found</h1>
          <p className="mt-2 text-sm">
            We could not find this registration session. Please register again.
          </p>
          <Link
            href={`${backPathPrefix}/${encodeURIComponent(eventCode)}`}
            className="mt-5 inline-flex rounded-xl border border-rose-300 px-4 py-2.5 text-sm font-medium hover:bg-rose-100"
          >
            Back to registration
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="px-4 py-10">
      <div className="mx-auto grid w-full max-w-3xl gap-5">
        <RegistrationConfirmationStatus
          initialData={{
            registrationId: statusView.registrationId,
            eventCode: statusView.eventCode,
            eventName: statusView.eventName,
            status: statusView.status,
            participant: statusView.participant,
            telegramLinked: statusView.telegramLinked,
            ticketSent: statusView.ticketSent,
            telegram: {
              token: statusView.token.value,
              deepLink: buildTelegramDeepLink(statusView.token.value),
              tokenExpiresAt: statusView.token.expiresAt,
              tokenConsumedAt: statusView.token.consumedAt,
            },
          }}
          duplicate={duplicate}
        />
      </div>
    </section>
  );
}

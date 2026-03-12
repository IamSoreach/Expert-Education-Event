import Link from "next/link";

import { RegistrationForm } from "@/components/registration-form";
import { getEventByCode } from "@/server/registration-flow";

type EventRegistrationPageProps = {
  eventCode: string;
  entryPoint: "web" | "telegram";
};

export async function EventRegistrationPage({ eventCode, entryPoint }: EventRegistrationPageProps) {
  const event = await getEventByCode(eventCode);

  if (!event || !event.isActive) {
    return (
      <section className="px-4 py-12">
        <div className="mx-auto max-w-2xl rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-900 shadow-sm">
          <h1 className="text-2xl font-semibold">Event unavailable</h1>
          <p className="mt-2 text-sm">
            This event does not exist or is not accepting registrations right now.
          </p>
          <Link
            href="/"
            className="mt-5 inline-flex rounded-xl border border-rose-300 px-4 py-2.5 text-sm font-medium hover:bg-rose-100"
          >
            Back to Home
          </Link>
        </div>
      </section>
    );
  }

  const confirmationPathPrefix = entryPoint === "telegram" ? "/telegram/register" : "/register";

  return (
    <section className="px-4 py-10">
      <div className="mx-auto grid w-full max-w-3xl gap-5">
        <RegistrationForm
          eventCode={event.code}
          entryPoint={entryPoint}
          confirmationPathPrefix={confirmationPathPrefix}
        />
      </div>
    </section>
  );
}

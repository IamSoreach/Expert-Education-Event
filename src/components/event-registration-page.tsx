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
        <div className="mx-auto max-w-2xl rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-900 shadow-sm">
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

  const startDate = event.startAt.toLocaleString();
  const endDate = event.endAt ? event.endAt.toLocaleString() : null;
  const confirmationPathPrefix = entryPoint === "telegram" ? "/telegram/register" : "/register";

  return (
    <section className="px-4 py-10">
      <div className="mx-auto grid w-full max-w-3xl gap-5">
        <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Event Registration</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">{event.name}</h1>
          {event.description ? <p className="mt-2 text-sm text-slate-600">{event.description}</p> : null}
          <div className="mt-4 grid gap-1 text-sm text-slate-700">
            <p>
              <span className="font-medium">Code:</span> {event.code}
            </p>
            <p>
              <span className="font-medium">Starts:</span> {startDate}
            </p>
            {endDate ? (
              <p>
                <span className="font-medium">Ends:</span> {endDate}
              </p>
            ) : null}
            {event.venue ? (
              <p>
                <span className="font-medium">Venue:</span> {event.venue}
              </p>
            ) : null}
          </div>
        </header>

        <RegistrationForm
          eventCode={event.code}
          entryPoint={entryPoint}
          confirmationPathPrefix={confirmationPathPrefix}
        />
      </div>
    </section>
  );
}

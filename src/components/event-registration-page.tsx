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

  const startDate = event.startAt.toLocaleString();
  const endDate = event.endAt ? event.endAt.toLocaleString() : null;
  const confirmationPathPrefix = entryPoint === "telegram" ? "/telegram/register" : "/register";

  return (
    <section className="px-4 py-10">
      <div className="mx-auto grid w-full max-w-3xl gap-5">
        <header className="theme-card p-6">
          <p className="text-xs uppercase tracking-[0.24em] text-[var(--brand-primary)]">Event Registration</p>
          <h1 className="mt-2 text-4xl font-semibold text-[var(--brand-ink)]">{event.name}</h1>
          {event.description ? <p className="mt-2 text-base text-[var(--brand-gray)]">{event.description}</p> : null}
          <div className="mt-4 grid gap-1 text-sm text-[var(--brand-gray)]">
            <p>
              <span className="font-semibold text-[var(--brand-ink)]">Code:</span> {event.code}
            </p>
            <p>
              <span className="font-semibold text-[var(--brand-ink)]">Starts:</span> {startDate}
            </p>
            {endDate ? (
              <p>
                <span className="font-semibold text-[var(--brand-ink)]">Ends:</span> {endDate}
              </p>
            ) : null}
            {event.venue ? (
              <p>
                <span className="font-semibold text-[var(--brand-ink)]">Venue:</span> {event.venue}
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

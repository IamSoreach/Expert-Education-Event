import Link from "next/link";

import { TelegramTicketLookupForm } from "@/components/telegram-ticket-lookup-form";
import { getEventByCode } from "@/server/registration-flow";

type TelegramCheckInByEventPageProps = {
  params: Promise<{
    eventCode: string;
  }>;
};

export default async function TelegramCheckInByEventPage({ params }: TelegramCheckInByEventPageProps) {
  const { eventCode } = await params;
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

  return <TelegramTicketLookupForm eventCode={event.code} eventName={event.name} />;
}

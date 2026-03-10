import { EventRegistrationPage } from "@/components/event-registration-page";

type RegisterByEventPageProps = {
  params: Promise<{
    eventCode: string;
  }>;
};

export default async function RegisterByEventPage({ params }: RegisterByEventPageProps) {
  const { eventCode } = await params;
  return <EventRegistrationPage eventCode={eventCode} entryPoint="web" />;
}

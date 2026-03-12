import { EventRegistrationPage } from "@/components/event-registration-page";

type TelegramRegisterByEventPageProps = {
  params: Promise<{
    eventCode: string;
  }>;
};

export default async function TelegramRegisterByEventPage({
  params,
}: TelegramRegisterByEventPageProps) {
  const { eventCode } = await params;
  return <EventRegistrationPage eventCode={eventCode} entryPoint="telegram" />;
}

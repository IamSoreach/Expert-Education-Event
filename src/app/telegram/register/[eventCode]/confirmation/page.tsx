import { RegistrationConfirmationView } from "@/components/registration-confirmation-view";

type TelegramConfirmationPageProps = {
  params: Promise<{
    eventCode: string;
  }>;
  searchParams: Promise<{
    registrationId?: string;
    token?: string;
    duplicate?: string;
  }>;
};

export default async function TelegramRegistrationConfirmationPage({
  params,
  searchParams,
}: TelegramConfirmationPageProps) {
  const { eventCode } = await params;
  const query = await searchParams;

  return (
    <RegistrationConfirmationView
      eventCode={eventCode}
      registrationId={query.registrationId}
      token={query.token}
      duplicate={query.duplicate === "1"}
      backPathPrefix="/telegram/register"
    />
  );
}

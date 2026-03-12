import { RegistrationConfirmationView } from "@/components/registration-confirmation-view";

type ConfirmationPageProps = {
  params: Promise<{
    eventCode: string;
  }>;
  searchParams: Promise<{
    registrationId?: string;
    token?: string;
  }>;
};

export default async function RegistrationConfirmationPage({
  params,
  searchParams,
}: ConfirmationPageProps) {
  const { eventCode } = await params;
  const query = await searchParams;

  return (
    <RegistrationConfirmationView
      eventCode={eventCode}
      registrationId={query.registrationId}
      token={query.token}
      backPathPrefix="/register"
    />
  );
}

import { redirect } from "next/navigation";

type TelegramRegisterByEventPageProps = {
  params: Promise<{
    eventCode: string;
  }>;
};

export default async function TelegramRegisterByEventPage({
  params,
}: TelegramRegisterByEventPageProps) {
  await params;
  redirect("/");
}

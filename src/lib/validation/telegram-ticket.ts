import { z } from "zod";

export const telegramTicketLookupPayloadSchema = z.object({
  eventCode: z.string().trim().min(1).max(64),
  phoneNumber: z
    .string()
    .trim()
    .min(6)
    .max(40)
    .regex(/^[\d+\s().-]+$/, "Phone number contains invalid characters."),
  telegramWebAppInitData: z.string().trim().min(10).max(4096),
});

export type TelegramTicketLookupPayload = z.infer<typeof telegramTicketLookupPayloadSchema>;

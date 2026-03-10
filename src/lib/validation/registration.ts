import { z } from "zod";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => value || undefined);

export const registrationPayloadSchema = z.object({
  eventCode: z.string().trim().min(1).max(64),
  fullName: z.string().trim().min(2).max(191),
  phoneNumber: z
    .string()
    .trim()
    .min(6)
    .max(40)
    .regex(/^[\d+\s().-]+$/, "Phone number contains invalid characters."),
  email: z
    .string()
    .trim()
    .email("Please enter a valid email address.")
    .max(191)
    .optional()
    .or(z.literal("")),
  organization: optionalText(191),
  notes: optionalText(2000),
  source: z.string().trim().max(64).optional().transform((value) => value || undefined),
  telegramWebAppInitData: z
    .string()
    .trim()
    .max(4096)
    .optional()
    .transform((value) => value || undefined),
});

export type RegistrationPayload = z.infer<typeof registrationPayloadSchema>;

export const registrationStatusQuerySchema = z.object({
  registrationId: z.string().trim().min(1).max(191),
  token: z.string().trim().min(1).max(191),
});

export type RegistrationStatusQuery = z.infer<typeof registrationStatusQuerySchema>;

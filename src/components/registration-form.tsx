"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";

import {
  RegistrationPayload,
  registrationPayloadSchema,
} from "@/lib/validation/registration";

type FormState = {
  fullName: string;
  phoneNumber: string;
  email: string;
  organization: string;
  notes: string;
};

type RegisterApiResponse = {
  registrationId: string;
  eventCode: string;
  duplicate: boolean;
  telegram: {
    token: string;
    deepLink: string;
    expiresAt: string;
  };
  participant: {
    fullName: string;
    phoneNumber: string;
    email: string | null;
    organization: string | null;
    notes: string | null;
  };
  miniApp?: {
    detected: boolean;
    verified: boolean;
    linked: boolean;
    ticketDelivery: "not_attempted" | "sent" | "already_sent" | "failed";
    message: string | null;
  } | null;
  error?: string;
};

type TelegramWebAppUser = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
};

type TelegramContext = {
  isWebApp: boolean;
  initData: string | null;
  user: TelegramWebAppUser | null;
};

type RegistrationFormProps = {
  eventCode: string;
  entryPoint?: "web" | "telegram";
  confirmationPathPrefix?: "/register" | "/telegram/register";
};

const initialState: FormState = {
  fullName: "",
  phoneNumber: "",
  email: "",
  organization: "",
  notes: "",
};

export function RegistrationForm({
  eventCode,
  entryPoint = "web",
  confirmationPathPrefix = "/register",
}: RegistrationFormProps) {
  const router = useRouter();
  const [formState, setFormState] = useState<FormState>(initialState);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [telegramContext, setTelegramContext] = useState<TelegramContext>({
    isWebApp: false,
    initData: null,
    user: null,
  });

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;

    const detectTelegramWebApp = () => {
      if (cancelled) {
        return true;
      }

      const telegramWebApp = window.Telegram?.WebApp;
      if (!telegramWebApp) {
        attempts += 1;
        return attempts >= 10;
      }

      const initData = telegramWebApp.initData?.trim() || "";
      const user = telegramWebApp.initDataUnsafe?.user;

      telegramWebApp.ready();
      telegramWebApp.expand();

      setTelegramContext({
        isWebApp: Boolean(initData),
        initData: initData || null,
        user: user ?? null,
      });

      if (user) {
        const suggestedName = [user.first_name, user.last_name].filter(Boolean).join(" ").trim();
        if (suggestedName) {
          setFormState((prev) => {
            if (prev.fullName.trim()) {
              return prev;
            }

            return {
              ...prev,
              fullName: suggestedName,
            };
          });
        }
      }

      return true;
    };

    if (detectTelegramWebApp()) {
      return;
    }

    const interval = window.setInterval(() => {
      if (detectTelegramWebApp()) {
        window.clearInterval(interval);
      }
    }, 300);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  const payloadPreview = useMemo(
    () => ({
      ...formState,
      eventCode,
      source: telegramContext.isWebApp
        ? "telegram_mini_app"
        : entryPoint === "telegram"
          ? "telegram_web_fallback"
          : "public_web",
      telegramWebAppInitData: telegramContext.isWebApp ? telegramContext.initData ?? undefined : undefined,
    }),
    [entryPoint, eventCode, formState, telegramContext.initData, telegramContext.isWebApp],
  );

  function setField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setFormState((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    setServerError(null);
  }

  function validateClient(): RegistrationPayload | null {
    const parsed = registrationPayloadSchema.safeParse(payloadPreview);
    if (!parsed.success) {
      const nextErrors: Partial<Record<keyof FormState, string>> = {};
      parsed.error.issues.forEach((issue) => {
        const [field] = issue.path;
        if (
          field === "fullName" ||
          field === "phoneNumber" ||
          field === "email" ||
          field === "organization" ||
          field === "notes"
        ) {
          nextErrors[field] = issue.message;
        }
      });
      setErrors(nextErrors);
      return null;
    }

    setErrors({});
    return parsed.data;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    const validated = validateClient();
    if (!validated) {
      return;
    }

    setIsSubmitting(true);
    setServerError(null);

    try {
      const response = await fetch("/api/public/register", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(validated),
      });

      const data = (await response.json()) as RegisterApiResponse;
      if (!response.ok) {
        throw new Error(
          data.error || "We could not complete registration at the moment. Please try again.",
        );
      }

      const query = new URLSearchParams({
        registrationId: data.registrationId,
        token: data.telegram.token,
        duplicate: data.duplicate ? "1" : "0",
      });

      router.push(
        `${confirmationPathPrefix}/${encodeURIComponent(eventCode)}/confirmation?${query.toString()}`,
      );
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : "Registration failed. Please try again.";
      setServerError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <Script src="https://telegram.org/js/telegram-web-app.js" strategy="afterInteractive" />

      <form onSubmit={handleSubmit} className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {telegramContext.isWebApp ? (
          <p className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900">
            Telegram Mini App session detected. We will try to link Telegram automatically after registration.
          </p>
        ) : entryPoint === "telegram" ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            Open this page inside Telegram for automatic account linking.
          </p>
        ) : null}

        <div className="grid gap-1">
          <label htmlFor="fullName" className="text-sm font-medium text-slate-700">
            Full name <span className="text-rose-600">*</span>
          </label>
          <input
            id="fullName"
            required
            value={formState.fullName}
            onChange={(event) => setField("fullName", event.target.value)}
            className="rounded-xl border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
            placeholder="Your full name"
          />
          {errors.fullName ? <p className="text-xs text-rose-600">{errors.fullName}</p> : null}
        </div>

        <div className="grid gap-1">
          <label htmlFor="phoneNumber" className="text-sm font-medium text-slate-700">
            Phone number <span className="text-rose-600">*</span>
          </label>
          <input
            id="phoneNumber"
            required
            value={formState.phoneNumber}
            onChange={(event) => setField("phoneNumber", event.target.value)}
            className="rounded-xl border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
            placeholder="+1 555 123 4567"
            inputMode="tel"
          />
          {errors.phoneNumber ? <p className="text-xs text-rose-600">{errors.phoneNumber}</p> : null}
        </div>

        <div className="grid gap-1">
          <label htmlFor="email" className="text-sm font-medium text-slate-700">
            Email (optional)
          </label>
          <input
            id="email"
            type="email"
            value={formState.email}
            onChange={(event) => setField("email", event.target.value)}
            className="rounded-xl border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
            placeholder="name@example.com"
          />
          {errors.email ? <p className="text-xs text-rose-600">{errors.email}</p> : null}
        </div>

        <div className="grid gap-1">
          <label htmlFor="organization" className="text-sm font-medium text-slate-700">
            Organization (optional)
          </label>
          <input
            id="organization"
            value={formState.organization}
            onChange={(event) => setField("organization", event.target.value)}
            className="rounded-xl border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
            placeholder="Company or group"
          />
          {errors.organization ? (
            <p className="text-xs text-rose-600">{errors.organization}</p>
          ) : null}
        </div>

        <div className="grid gap-1">
          <label htmlFor="notes" className="text-sm font-medium text-slate-700">
            Notes (optional)
          </label>
          <textarea
            id="notes"
            rows={3}
            value={formState.notes}
            onChange={(event) => setField("notes", event.target.value)}
            className="rounded-xl border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
            placeholder="Anything organizers should know"
          />
          {errors.notes ? <p className="text-xs text-rose-600">{errors.notes}</p> : null}
        </div>

        {serverError ? (
          <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{serverError}</p>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-2 inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {isSubmitting ? "Submitting..." : "Continue"}
        </button>
      </form>
    </>
  );
}

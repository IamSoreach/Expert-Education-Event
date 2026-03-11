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
  const [selectedFlow, setSelectedFlow] = useState<"choose" | "register">(
    entryPoint === "telegram" ? "choose" : "register",
  );
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

  function handleCheckInClick() {
    router.push(`/telegram/check-in/${encodeURIComponent(eventCode)}`);
  }

  if (selectedFlow === "choose") {
    return (
      <>
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="afterInteractive" />

        <section className="theme-card grid gap-4 p-6">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--brand-primary)]">Choose Flow</p>
            <h2 className="mt-2 text-2xl font-semibold text-[var(--brand-ink)]">What do you want to do?</h2>
            <p className="mt-2 text-sm text-[var(--brand-gray)]">
              Start a new registration or open ticket check-in lookup.
            </p>
          </div>

          <div className="grid gap-3">
            <button
              type="button"
              onClick={() => setSelectedFlow("register")}
              className="theme-button-primary inline-flex items-center justify-center px-4 py-2.5"
            >
              New Registration
            </button>
            <button
              type="button"
              onClick={handleCheckInClick}
              className="theme-button-secondary inline-flex items-center justify-center px-4 py-2.5"
            >
              Check-in
            </button>
          </div>

          {entryPoint !== "telegram" ? (
            <p className="rounded-xl border border-[var(--brand-secondary)]/35 bg-[var(--brand-secondary)]/10 px-3 py-2 text-xs text-[var(--brand-ink)]">
              Check-in works best when this page is opened from Telegram.
            </p>
          ) : null}
        </section>
      </>
    );
  }

  return (
    <>
      <Script src="https://telegram.org/js/telegram-web-app.js" strategy="afterInteractive" />

      <form
        onSubmit={handleSubmit}
        className="theme-card grid gap-4 p-6"
      >
        {entryPoint === "telegram" ? (
          <button
            type="button"
            onClick={() => setSelectedFlow("choose")}
            className="w-fit rounded-lg border border-[var(--brand-border)] px-3 py-1.5 text-xs font-semibold text-[var(--brand-gray)] transition hover:bg-[var(--background)]"
          >
            Back to Options
          </button>
        ) : null}

        {telegramContext.isWebApp ? (
          <p className="rounded-xl border border-[var(--brand-secondary)]/40 bg-[var(--brand-secondary)]/10 px-3 py-2 text-xs text-[var(--brand-ink)]">
            Telegram Mini App session detected. We will try to link Telegram automatically after registration.
          </p>
        ) : entryPoint === "telegram" ? (
          <p className="rounded-xl border border-[var(--brand-secondary)]/40 bg-[var(--brand-secondary)]/10 px-3 py-2 text-xs text-[var(--brand-ink)]">
            Open this page inside Telegram for automatic account linking.
          </p>
        ) : null}

        <div className="grid gap-1">
          <label htmlFor="fullName" className="text-sm font-semibold text-[var(--brand-ink)]">
            Full name <span className="text-rose-600">*</span>
          </label>
          <input
            id="fullName"
            required
            value={formState.fullName}
            onChange={(event) => setField("fullName", event.target.value)}
            className="theme-input px-3 py-2"
            placeholder="Your full name"
          />
          {errors.fullName ? <p className="text-xs text-rose-600">{errors.fullName}</p> : null}
        </div>

        <div className="grid gap-1">
          <label htmlFor="phoneNumber" className="text-sm font-semibold text-[var(--brand-ink)]">
            Phone number <span className="text-rose-600">*</span>
          </label>
          <input
            id="phoneNumber"
            required
            value={formState.phoneNumber}
            onChange={(event) => setField("phoneNumber", event.target.value)}
            className="theme-input px-3 py-2"
            placeholder="0XX XXX XXX"
            inputMode="tel"
          />
          {errors.phoneNumber ? <p className="text-xs text-rose-600">{errors.phoneNumber}</p> : null}
        </div>

        <div className="grid gap-1">
          <label htmlFor="email" className="text-sm font-semibold text-[var(--brand-ink)]">
            Email (optional)
          </label>
          <input
            id="email"
            type="email"
            value={formState.email}
            onChange={(event) => setField("email", event.target.value)}
            className="theme-input px-3 py-2"
            placeholder="name@example.com"
          />
          {errors.email ? <p className="text-xs text-rose-600">{errors.email}</p> : null}
        </div>

        <div className="grid gap-1">
          <label htmlFor="organization" className="text-sm font-semibold text-[var(--brand-ink)]">
            Organization (optional)
          </label>
          <input
            id="organization"
            value={formState.organization}
            onChange={(event) => setField("organization", event.target.value)}
            className="theme-input px-3 py-2"
            placeholder="Company or group"
          />
          {errors.organization ? (
            <p className="text-xs text-rose-600">{errors.organization}</p>
          ) : null}
        </div>

        <div className="grid gap-1">
          <label htmlFor="notes" className="text-sm font-semibold text-[var(--brand-ink)]">
            Notes (optional)
          </label>
          <textarea
            id="notes"
            rows={3}
            value={formState.notes}
            onChange={(event) => setField("notes", event.target.value)}
            className="theme-input px-3 py-2"
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
          className="palette-cycle-button mt-2 inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-white disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Submitting..." : "Continue"}
        </button>
      </form>
    </>
  );
}

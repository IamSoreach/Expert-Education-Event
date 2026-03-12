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

type MiniAppProfileResponse = {
  fullName?: string | null;
  phoneNumber?: string | null;
  error?: string;
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

function parseTelegramUserFromInitData(initData: string): TelegramWebAppUser | null {
  if (!initData) {
    return null;
  }

  try {
    const params = new URLSearchParams(initData);
    const userRaw = params.get("user");
    if (!userRaw) {
      return null;
    }

    const parsed = JSON.parse(userRaw) as Partial<TelegramWebAppUser>;
    if (typeof parsed.id !== "number" || !Number.isFinite(parsed.id)) {
      return null;
    }

    return {
      id: parsed.id,
      first_name: typeof parsed.first_name === "string" ? parsed.first_name : undefined,
      last_name: typeof parsed.last_name === "string" ? parsed.last_name : undefined,
      username: typeof parsed.username === "string" ? parsed.username : undefined,
    };
  } catch {
    return null;
  }
}

function readTelegramInitDataFromUrl(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const params = new URLSearchParams(window.location.search);
  const raw = params.get("tgWebAppData");
  if (!raw) {
    return null;
  }

  const value = raw.trim();
  return value.length > 0 ? value : null;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function readTelegramContextSnapshot(): TelegramContext {
  if (typeof window === "undefined") {
    return {
      isWebApp: false,
      initData: null,
      user: null,
    };
  }

  const telegramWebApp = window.Telegram?.WebApp;
  const initDataFromScript = telegramWebApp?.initData?.trim() || "";
  const initDataFromUrl = readTelegramInitDataFromUrl() ?? "";
  const initData = initDataFromScript || initDataFromUrl || null;
  const user = telegramWebApp?.initDataUnsafe?.user ?? parseTelegramUserFromInitData(initData ?? "");

  return {
    isWebApp: Boolean(telegramWebApp || initData),
    initData,
    user: user ?? null,
  };
}

async function waitForTelegramContext(maxWaitMs = 2500): Promise<TelegramContext> {
  const startedAt = Date.now();
  let snapshot = readTelegramContextSnapshot();

  while (!snapshot.initData && Date.now() - startedAt < maxWaitMs) {
    await wait(120);
    snapshot = readTelegramContextSnapshot();
  }

  return snapshot;
}

function buildSuggestedName(user: TelegramWebAppUser | null): string {
  if (!user) {
    return "";
  }

  return [user.first_name, user.last_name].filter(Boolean).join(" ").trim();
}

export function RegistrationForm({
  eventCode,
  entryPoint = "web",
  confirmationPathPrefix = "/register",
}: RegistrationFormProps) {
  const expertChannelUrl = "https://t.me/experteducationvisacambodia";
  const router = useRouter();
  const [formState, setFormState] = useState<FormState>(initialState);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFlow, setSelectedFlow] = useState<"choose" | "register">(
    "register",
  );
  const [isHydratingProfile, setIsHydratingProfile] = useState(false);
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
      const snapshot = readTelegramContextSnapshot();
      const telegramWebApp = window.Telegram?.WebApp;

      if (!snapshot.isWebApp) {
        attempts += 1;
        return attempts >= 60;
      }

      telegramWebApp?.ready();
      telegramWebApp?.expand();

      setTelegramContext(snapshot);

      const suggestedName = buildSuggestedName(snapshot.user);
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

      if (snapshot.initData) {
        return true;
      }

      attempts += 1;
      return attempts >= 60;
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

  useEffect(() => {
    if (!telegramContext.isWebApp || !telegramContext.initData) {
      return;
    }

    let cancelled = false;

    const hydrateProfile = async () => {
      setIsHydratingProfile(true);

      try {
        const response = await fetch("/api/public/miniapp-profile", {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            telegramWebAppInitData: telegramContext.initData,
          }),
        });

        const data = (await response.json()) as MiniAppProfileResponse;
        if (!response.ok || cancelled) {
          return;
        }

        setFormState((prev) => {
          const nextFullName = prev.fullName.trim()
            ? prev.fullName
            : (data.fullName?.trim() ?? prev.fullName);
          const nextPhone = prev.phoneNumber.trim()
            ? prev.phoneNumber
            : (data.phoneNumber?.trim() ?? prev.phoneNumber);

          if (nextFullName === prev.fullName && nextPhone === prev.phoneNumber) {
            return prev;
          }

          return {
            ...prev,
            fullName: nextFullName,
            phoneNumber: nextPhone,
          };
        });
      } catch {
        // Non-blocking: form still works with manual entry.
      } finally {
        if (!cancelled) {
          setIsHydratingProfile(false);
        }
      }
    };

    void hydrateProfile();

    return () => {
      cancelled = true;
    };
  }, [telegramContext.initData, telegramContext.isWebApp]);

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

  function validateClient(payload: unknown = payloadPreview): RegistrationPayload | null {
    const parsed = registrationPayloadSchema.safeParse(payload);
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

    const liveContext = await waitForTelegramContext();
    if (
      liveContext.isWebApp &&
      (liveContext.initData !== telegramContext.initData || liveContext.user?.id !== telegramContext.user?.id)
    ) {
      setTelegramContext(liveContext);
    }

    const livePayload = {
      ...formState,
      eventCode,
      source: liveContext.isWebApp
        ? "telegram_mini_app"
        : entryPoint === "telegram"
          ? "telegram_web_fallback"
          : "public_web",
      telegramWebAppInitData: liveContext.isWebApp ? liveContext.initData ?? undefined : undefined,
    };

    if (entryPoint === "telegram" && !liveContext.initData) {
      setServerError(
        "Telegram session is still loading. Please open this page from the bot and try again in 2 seconds.",
      );
      return;
    }

    const validated = validateClient(livePayload);
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
            <a
              href={expertChannelUrl}
              target="_blank"
              rel="noreferrer"
              className="theme-button-primary inline-flex items-center justify-center px-4 py-2.5"
            >
              Join Expert Telegram Channel
            </a>
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
          {telegramContext.isWebApp ? (
            <p className="text-[11px] text-[var(--brand-gray)]">
              {isHydratingProfile
                ? "Checking your linked Telegram profile for a saved phone number..."
                : "Telegram does not expose phone automatically on first use. Enter once and it can auto-fill after your account is linked."}
            </p>
          ) : null}
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

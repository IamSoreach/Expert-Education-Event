"use client";

import { FormEvent, useEffect, useState } from "react";
import Script from "next/script";

import { telegramTicketLookupPayloadSchema } from "@/lib/validation/telegram-ticket";

type TelegramTicketLookupFormProps = {
  eventCode: string;
  eventName: string;
};

type TelegramContext = {
  isWebApp: boolean;
  initData: string | null;
};

type TicketLookupResponse = {
  ok?: boolean;
  message?: string;
  participantName?: string;
  eventName?: string;
  ticketCode?: string;
  ticketDelivery?: "sent" | "resent";
  error?: string;
};

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export function TelegramTicketLookupForm({ eventCode, eventName }: TelegramTicketLookupFormProps) {
  const expertChannelUrl = "https://t.me/experteducationvisacambodia";
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState<TicketLookupResponse | null>(null);
  const [telegramContext, setTelegramContext] = useState<TelegramContext>({
    isWebApp: false,
    initData: null,
  });

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

  function readTelegramContextSnapshot(): TelegramContext {
    if (typeof window === "undefined") {
      return {
        isWebApp: false,
        initData: null,
      };
    }

    const telegramWebApp = window.Telegram?.WebApp;
    const directInitData = telegramWebApp?.initData?.trim() || "";
    const initData = directInitData || readTelegramInitDataFromUrl() || "";

    return {
      isWebApp: Boolean(telegramWebApp || initData),
      initData: initData || null,
    };
  }

  async function waitForTelegramContext(maxWaitMs = 8000): Promise<TelegramContext> {
    const startedAt = Date.now();
    let snapshot = readTelegramContextSnapshot();

    while (!snapshot.initData && Date.now() - startedAt < maxWaitMs) {
      await wait(120);
      snapshot = readTelegramContextSnapshot();
    }

    return snapshot;
  }

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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    setServerError(null);
    setSuccess(null);

    const liveContext = await waitForTelegramContext();
    if (liveContext.initData !== telegramContext.initData || liveContext.isWebApp !== telegramContext.isWebApp) {
      setTelegramContext(liveContext);
    }

    const payload = {
      eventCode,
      phoneNumber,
      telegramWebAppInitData: liveContext.initData ?? "",
    };

    if (!liveContext.initData) {
      setServerError("Telegram session not detected. Open from bot /checkin and try again in 2 seconds.");
      return;
    }

    const parsed = telegramTicketLookupPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      setServerError("Please enter a valid phone number and open this page from Telegram bot /checkin.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/telegram/miniapp-ticket", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(parsed.data),
      });

      const data = (await response.json()) as TicketLookupResponse;
      if (!response.ok) {
        throw new Error(data.error || "Could not send your ticket. Please try again.");
      }

      setSuccess(data);
    } catch (submitError) {
      setServerError(
        submitError instanceof Error
          ? submitError.message
          : "Could not send your ticket. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <Script src="https://telegram.org/js/telegram-web-app.js" strategy="afterInteractive" />

      <section className="px-4 py-10">
        <div className="mx-auto grid w-full max-w-2xl gap-4">
          <header className="theme-card p-6">
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--brand-primary)]">
              Telegram Ticket Lookup
            </p>
            <h1 className="mt-2 text-4xl font-semibold text-[var(--brand-ink)]">{eventName}</h1>
            <p className="mt-2 text-sm text-[var(--brand-gray)]">
              Enter the same phone number used during registration. We will send your QR ticket to this chat.
            </p>
          </header>

          <form
            onSubmit={handleSubmit}
            className="theme-card grid gap-4 p-6"
          >
            {telegramContext.isWebApp && telegramContext.initData ? (
              <p className="rounded-xl border border-[var(--brand-secondary)]/40 bg-[var(--brand-secondary)]/10 px-3 py-2 text-xs text-[var(--brand-ink)]">
                Telegram session detected and verified.
              </p>
            ) : telegramContext.isWebApp ? (
              <p className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                Telegram app detected, but secure session data is missing. Re-open from bot <b>/checkin</b>.
              </p>
            ) : (
              <p className="rounded-xl border border-[var(--brand-secondary)]/40 bg-[var(--brand-secondary)]/10 px-3 py-2 text-xs text-[var(--brand-ink)]">
                Open this page from the bot command inside Telegram.
              </p>
            )}

            <label className="grid gap-1">
              <span className="text-sm font-semibold text-[var(--brand-ink)]">
                Phone Number <span className="text-rose-600">*</span>
              </span>
              <input
                value={phoneNumber}
                onChange={(event) => setPhoneNumber(event.target.value)}
                required
                inputMode="tel"
                placeholder="0XX XXX XXX"
                className="theme-input px-3 py-2"
              />
            </label>

            {serverError ? (
              <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
                {serverError}
              </p>
            ) : null}

            {success ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                <p className="font-medium">{success.message ?? "Ticket processed."}</p>
                {success.participantName ? <p className="mt-1">Name: {success.participantName}</p> : null}
                {success.ticketCode ? <p className="mt-1">Ticket: {success.ticketCode}</p> : null}
                <a
                  href={expertChannelUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="palette-cycle-button mt-3 inline-flex items-center justify-center rounded-xl px-4 py-2 text-xs font-semibold text-white shadow-[0_12px_22px_-14px_rgba(6,50,99,0.75)]"
                >
                  Join Expert Telegram Channel
                </a>
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="theme-button-primary inline-flex items-center justify-center px-4 py-2.5"
            >
              {isSubmitting ? "Sending..." : "Send My Ticket"}
            </button>
          </form>
        </div>
      </section>
    </>
  );
}

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

export function TelegramTicketLookupForm({ eventCode, eventName }: TelegramTicketLookupFormProps) {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState<TicketLookupResponse | null>(null);
  const [telegramContext, setTelegramContext] = useState<TelegramContext>({
    isWebApp: false,
    initData: null,
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
      telegramWebApp.ready();
      telegramWebApp.expand();

      setTelegramContext({
        isWebApp: Boolean(initData),
        initData: initData || null,
      });

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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    setServerError(null);
    setSuccess(null);

    const payload = {
      eventCode,
      phoneNumber,
      telegramWebAppInitData: telegramContext.initData ?? "",
    };

    const parsed = telegramTicketLookupPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      setServerError("Please enter a valid phone number and open this page from Telegram.");
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
          <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Telegram Ticket Lookup</p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-900">{eventName}</h1>
            <p className="mt-2 text-sm text-slate-600">
              Enter the same phone number used during registration. We will send your QR ticket to this chat.
            </p>
          </header>

          <form
            onSubmit={handleSubmit}
            className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            {telegramContext.isWebApp ? (
              <p className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900">
                Telegram session detected.
              </p>
            ) : (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                Open this page from the bot command inside Telegram.
              </p>
            )}

            <label className="grid gap-1">
              <span className="text-sm font-medium text-slate-700">
                Phone Number <span className="text-rose-600">*</span>
              </span>
              <input
                value={phoneNumber}
                onChange={(event) => setPhoneNumber(event.target.value)}
                required
                inputMode="tel"
                placeholder="+855 12 345 678"
                className="rounded-xl border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
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
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {isSubmitting ? "Sending..." : "Send My Ticket"}
            </button>
          </form>
        </div>
      </section>
    </>
  );
}

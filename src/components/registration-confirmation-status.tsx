"use client";

import { useEffect, useMemo, useState } from "react";

type RegistrationStatusPayload = {
  registrationId: string;
  eventCode: string;
  eventName: string;
  status: "PENDING" | "LINKED" | "TICKET_SENT" | "CHECKED_IN" | "CANCELLED";
  participant: {
    fullName: string;
    phoneNumber: string;
    email: string | null;
    organization: string | null;
    notes: string | null;
  };
  telegramLinked: boolean;
  ticketSent: boolean;
  telegram: {
    token: string;
    deepLink: string;
    tokenExpiresAt: string;
    tokenConsumedAt: string | null;
  };
};

type Props = {
  initialData: RegistrationStatusPayload;
  duplicate?: boolean;
};

type LinkStatusPollResponse = {
  registrationId: string;
  status: RegistrationStatusPayload["status"];
  telegramLinked: boolean;
  ticketSent: boolean;
  tokenConsumed: boolean;
  tokenExpired: boolean;
};

export function RegistrationConfirmationStatus({ initialData, duplicate = false }: Props) {
  const [data, setData] = useState<RegistrationStatusPayload>(initialData);
  const [error, setError] = useState<string | null>(null);
  const [tokenExpired, setTokenExpired] = useState(false);

  const query = useMemo(
    () =>
      new URLSearchParams({
        registrationId: data.registrationId,
        token: data.telegram.token,
      }).toString(),
    [data.registrationId, data.telegram.token],
  );

  useEffect(() => {
    if (data.ticketSent) {
      return;
    }

    let isCancelled = false;
    const poll = async () => {
      try {
        const response = await fetch(`/api/public/registration-link-status?${query}`, {
          cache: "no-store",
        });

        if (!response.ok) {
          const payload = (await response.json()) as { error?: string };
          throw new Error(payload.error || "Status check failed.");
        }

        const payload = (await response.json()) as LinkStatusPollResponse;
        if (!isCancelled) {
          setData((prev) => ({
            ...prev,
            status: payload.status,
            telegramLinked: payload.telegramLinked,
            ticketSent: payload.ticketSent,
          }));
          setTokenExpired(payload.tokenExpired);
          setError(null);
        }
      } catch (pollError) {
        if (!isCancelled) {
          setError(
            pollError instanceof Error
              ? pollError.message
              : "We could not refresh the status right now.",
          );
        }
      }
    };

    const interval = setInterval(() => {
      void poll();
    }, 4000);

    void poll();
    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, [data.ticketSent, query]);

  const tokenExpiryText = useMemo(
    () => new Date(data.telegram.tokenExpiresAt).toLocaleString(),
    [data.telegram.tokenExpiresAt],
  );

  const stateCardClass = data.ticketSent
    ? "border-emerald-200 bg-emerald-50 text-emerald-900"
    : data.telegramLinked
      ? "border-blue-200 bg-blue-50 text-blue-900"
      : "border-amber-200 bg-amber-50 text-amber-900";

  return (
    <section className="grid gap-5">
      <article className={`rounded-2xl border p-5 ${stateCardClass}`}>
        <h1 className="text-2xl font-semibold">
          {data.ticketSent
            ? "Ticket sent to Telegram"
            : data.telegramLinked
              ? "Telegram linked successfully"
              : "Registration complete"}
        </h1>
        <p className="mt-2 text-sm">
          {data.ticketSent
            ? "Your QR ticket is now in your Telegram chat."
            : data.telegramLinked
              ? "We are preparing your ticket and will send it to Telegram shortly."
              : "Connect Telegram to receive your QR ticket."}
        </p>
      </article>

      {duplicate ? (
        <article className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
          A previous registration was found for this event and your details were reused.
        </article>
      ) : null}

      <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Submitted details</h2>
        <dl className="mt-3 grid gap-2 text-sm text-slate-700">
          <div>
            <dt className="font-medium">Name</dt>
            <dd>{data.participant.fullName}</dd>
          </div>
          <div>
            <dt className="font-medium">Phone</dt>
            <dd>{data.participant.phoneNumber}</dd>
          </div>
          {data.participant.email ? (
            <div>
              <dt className="font-medium">Email</dt>
              <dd>{data.participant.email}</dd>
            </div>
          ) : null}
          {data.participant.organization ? (
            <div>
              <dt className="font-medium">Organization</dt>
              <dd>{data.participant.organization}</dd>
            </div>
          ) : null}
          {data.participant.notes ? (
            <div>
              <dt className="font-medium">Notes</dt>
              <dd>{data.participant.notes}</dd>
            </div>
          ) : null}
        </dl>
      </article>

      <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Connect Telegram</h2>
        <p className="mt-2 text-sm text-slate-600">
          Use Telegram to receive your QR ticket for this event.
        </p>
        <a
          href={data.telegram.deepLink}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-700"
        >
          Open Telegram Bot
        </a>
        <ol className="mt-4 grid gap-1 text-sm text-slate-700">
          <li>1. Tap the button</li>
          <li>2. Open the bot</li>
          <li>3. Press Start</li>
          <li>4. The ticket will be sent there</li>
        </ol>
        <p className="mt-3 text-xs text-slate-500">Link expires: {tokenExpiryText}</p>
        {tokenExpired && !data.telegramLinked ? (
          <p className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
            This link has expired. Submit registration again to get a new Telegram link.
          </p>
        ) : null}
      </article>

      {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
    </section>
  );
}

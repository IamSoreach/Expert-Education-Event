import Link from "next/link";
import { ConfirmationStatus, Prisma, RegistrationStatus } from "@prisma/client";
import { redirect } from "next/navigation";

import { StaffLogoutButton } from "@/components/staff-logout-button";
import { isStaffSessionValid } from "@/lib/auth";
import { formatDateTimePhnomPenh } from "@/lib/datetime";
import { getEnv } from "@/lib/env";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const STATUS_OPTIONS = Object.values(RegistrationStatus);
const CONFIRMATION_OPTIONS = Object.values(ConfirmationStatus);

type StaffRegistrationsPageProps = {
  searchParams: Promise<{
    event?: string;
    status?: string;
    confirmation?: string;
    q?: string;
    limit?: string;
  }>;
};

function parseLimit(raw: string | undefined): number {
  const parsed = Number.parseInt(raw ?? "100", 10);
  if (!Number.isFinite(parsed)) {
    return 100;
  }
  return Math.min(Math.max(parsed, 20), 300);
}

function toDateTime(value: Date | null): string {
  return formatDateTimePhnomPenh(value);
}

function getStatusTone(status: RegistrationStatus): string {
  switch (status) {
    case RegistrationStatus.PENDING:
      return "border-slate-300 bg-slate-100 text-slate-700";
    case RegistrationStatus.LINKED:
      return "border-blue-300 bg-blue-100 text-blue-800";
    case RegistrationStatus.TICKET_SENT:
      return "border-emerald-300 bg-emerald-100 text-emerald-800";
    case RegistrationStatus.CHECKED_IN:
      return "border-amber-300 bg-amber-100 text-amber-800";
    case RegistrationStatus.CANCELLED:
      return "border-rose-300 bg-rose-100 text-rose-800";
    default:
      return "border-slate-300 bg-slate-100 text-slate-700";
  }
}

function getConfirmationTone(status: ConfirmationStatus): string {
  switch (status) {
    case ConfirmationStatus.SENT:
      return "border-emerald-300 bg-emerald-100 text-emerald-800";
    case ConfirmationStatus.INVALID:
      return "border-rose-300 bg-rose-100 text-rose-800";
    default:
      return "border-slate-300 bg-slate-100 text-slate-700";
  }
}

export default async function StaffRegistrationsPage({ searchParams }: StaffRegistrationsPageProps) {
  const env = getEnv();
  const hasSession = await isStaffSessionValid(env.STAFF_AUTH_SECRET);
  if (!hasSession) {
    redirect("/staff/login");
  }

  const params = await searchParams;
  const eventFilter = params.event?.trim() || "";
  const searchText = params.q?.trim() || "";
  const limit = parseLimit(params.limit);
  const statusFilter = STATUS_OPTIONS.find((item) => item === params.status);
  const confirmationFilter = CONFIRMATION_OPTIONS.find((item) => item === params.confirmation);

  const whereBase: Prisma.RegistrationWhereInput = {};

  if (eventFilter) {
    whereBase.event = {
      code: eventFilter,
    };
  }

  if (searchText) {
    whereBase.OR = [
      {
        participant: {
          fullName: {
            contains: searchText,
          },
        },
      },
      {
        participant: {
          phoneNumber: {
            contains: searchText,
          },
        },
      },
      {
        participant: {
          email: {
            contains: searchText,
          },
        },
      },
      {
        event: {
          name: {
            contains: searchText,
          },
        },
      },
      {
        event: {
          code: {
            contains: searchText,
          },
        },
      },
      {
        ticket: {
          ticketCode: {
            contains: searchText,
          },
        },
      },
    ];
  }

  const where: Prisma.RegistrationWhereInput = {
    ...whereBase,
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(confirmationFilter ? { confirmationStatus: confirmationFilter } : {}),
  };

  const [
    registrations,
    totalMatching,
    events,
    pendingCount,
    linkedCount,
    sentCount,
    checkedInCount,
    confirmationSentCount,
    confirmationInvalidCount,
  ] =
    await Promise.all([
      prisma.registration.findMany({
        where,
        orderBy: {
          createdAt: "desc",
        },
        take: limit,
        include: {
          event: {
            select: {
              name: true,
              code: true,
            },
          },
          participant: {
            select: {
              fullName: true,
              phoneNumber: true,
              email: true,
              organization: true,
              telegramUsername: true,
            },
          },
          ticket: {
            select: {
              ticketCode: true,
              sentAt: true,
              checkedInAt: true,
            },
          },
        },
      }),
      prisma.registration.count({
        where,
      }),
      prisma.event.findMany({
        orderBy: {
          startAt: "desc",
        },
        select: {
          code: true,
          name: true,
          isActive: true,
        },
      }),
      prisma.registration.count({
        where: {
          ...whereBase,
          status: RegistrationStatus.PENDING,
        },
      }),
      prisma.registration.count({
        where: {
          ...whereBase,
          status: RegistrationStatus.LINKED,
        },
      }),
      prisma.registration.count({
        where: {
          ...whereBase,
          status: RegistrationStatus.TICKET_SENT,
        },
      }),
      prisma.registration.count({
        where: {
          ...whereBase,
          status: RegistrationStatus.CHECKED_IN,
        },
      }),
      prisma.registration.count({
        where: {
          ...whereBase,
          confirmationStatus: ConfirmationStatus.SENT,
        },
      }),
      prisma.registration.count({
        where: {
          ...whereBase,
          confirmationStatus: ConfirmationStatus.INVALID,
        },
      }),
    ]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#edf3fb] via-[#f7fbff] to-[#f3f7ff] px-4 py-8">
      <div className="mx-auto grid w-full max-w-7xl gap-5">
        <header className="flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-cyan-100/40 bg-gradient-to-r from-[#063263] via-[#1877F2] to-[#00CDC4] px-6 py-5 text-white shadow-[0_18px_42px_-24px_rgba(6,50,99,0.7)]">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-white/80">Staff Console</p>
            <h1 className="mt-1 text-2xl font-semibold text-white">Registrations</h1>
            <p className="mt-1 text-sm text-white/85">
              Live view of captured participant registrations and ticket states.
            </p>
            <p className="mt-1 text-xs text-white/80">All times shown in Phnom Penh time (UTC+7).</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/staff/dashboard"
              className="rounded-xl border border-white/45 bg-white/15 px-3 py-2 text-sm font-medium text-white transition hover:bg-white/25"
            >
              Dashboard
            </Link>
            <StaffLogoutButton className="rounded-xl border border-white/45 bg-white/15 px-3 py-2 text-sm font-medium text-white transition hover:bg-white/25" />
          </div>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
          <MetricCard title="Matching Rows" value={totalMatching} tone="slate" />
          <MetricCard title="Pending" value={pendingCount} tone="slate" />
          <MetricCard title="Linked" value={linkedCount} tone="blue" />
          <MetricCard title="Ticket Sent" value={sentCount} tone="green" />
          <MetricCard title="Checked In" value={checkedInCount} tone="amber" />
          <MetricCard title="Confirmation Sent" value={confirmationSentCount} tone="green" />
          <MetricCard title="Confirmation Invalid" value={confirmationInvalidCount} tone="red" />
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <form method="get" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <label className="grid min-w-0 gap-1 text-sm text-slate-700">
              Event
              <select
                name="event"
                defaultValue={eventFilter}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">All events</option>
                {events.map((event) => (
                  <option key={event.code} value={event.code}>
                    {event.name} ({event.code}){event.isActive ? "" : " [inactive]"}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid min-w-0 gap-1 text-sm text-slate-700">
              Status
              <select
                name="status"
                defaultValue={statusFilter ?? ""}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">All statuses</option>
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid min-w-0 gap-1 text-sm text-slate-700">
              Confirmation
              <select
                name="confirmation"
                defaultValue={confirmationFilter ?? ""}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">All confirmations</option>
                {CONFIRMATION_OPTIONS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid min-w-0 gap-1 text-sm text-slate-700">
              Search
              <input
                name="q"
                defaultValue={searchText}
                placeholder="Name, phone, email, event, ticket..."
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </label>

            <label className="grid min-w-0 gap-1 text-sm text-slate-700">
              Limit
              <input
                name="limit"
                defaultValue={String(limit)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </label>

            <div className="md:col-span-5 flex flex-wrap gap-2">
              <button
                type="submit"
                className="palette-cycle-button rounded-xl px-4 py-2.5 text-sm font-medium text-white"
              >
                Apply Filters
              </button>
              <Link
                href="/staff/registrations"
                className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Reset
              </Link>
            </div>
          </form>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="overflow-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="px-3 py-2 font-medium">Submitted</th>
                  <th className="px-3 py-2 font-medium">Event</th>
                  <th className="px-3 py-2 font-medium">Participant</th>
                  <th className="px-3 py-2 font-medium">Contact</th>
                  <th className="px-3 py-2 font-medium">Telegram</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Confirmation</th>
                  <th className="px-3 py-2 font-medium">Ticket</th>
                  <th className="px-3 py-2 font-medium">Check-In</th>
                </tr>
              </thead>
              <tbody>
                {registrations.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100 align-top">
                    <td className="px-3 py-2 whitespace-nowrap">{toDateTime(row.createdAt)}</td>
                    <td className="px-3 py-2">
                      <div className="font-medium text-slate-900">{row.event.name}</div>
                      <div className="text-xs text-slate-500">{row.event.code}</div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-medium text-slate-900">{row.participant.fullName}</div>
                      <div className="text-xs text-slate-500">{row.participant.organization || "-"}</div>
                    </td>
                    <td className="px-3 py-2">
                      <div>{row.participant.phoneNumber}</div>
                      <div className="text-xs text-slate-500">{row.participant.email || "-"}</div>
                    </td>
                    <td className="px-3 py-2">{row.participant.telegramUsername || "-"}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${getStatusTone(
                          row.status,
                        )}`}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${getConfirmationTone(
                          row.confirmationStatus,
                        )}`}
                      >
                        {row.confirmationStatus}
                      </span>
                      <div className="mt-1 text-xs text-slate-500">
                        {toDateTime(row.confirmationSentAt ?? null)}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div>{row.ticket?.ticketCode || "-"}</div>
                      <div className="text-xs text-slate-500">Sent: {toDateTime(row.ticket?.sentAt ?? null)}</div>
                    </td>
                    <td className="px-3 py-2">{toDateTime(row.ticket?.checkedInAt ?? null)}</td>
                  </tr>
                ))}
                {registrations.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-3 py-6 text-center text-slate-500">
                      No registrations matched your filter.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

type MetricCardProps = {
  title: string;
  value: number;
  tone: "slate" | "blue" | "green" | "amber" | "red";
};

function MetricCard({ title, value, tone }: MetricCardProps) {
  const toneMap = {
    slate: "border-slate-200 bg-white text-slate-900",
    blue: "border-blue-200 bg-blue-50 text-blue-900",
    green: "border-emerald-200 bg-emerald-50 text-emerald-900",
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    red: "border-rose-200 bg-rose-50 text-rose-900",
  };

  return (
    <article className={`rounded-2xl border p-4 shadow-sm ${toneMap[tone]}`}>
      <p className="text-xs uppercase tracking-[0.12em]">{title}</p>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
    </article>
  );
}

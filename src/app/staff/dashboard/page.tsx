import Link from "next/link";
import { ScanResult } from "@prisma/client";
import { redirect } from "next/navigation";

import { StaffLogoutButton } from "@/components/staff-logout-button";
import { isStaffSessionValid } from "@/lib/auth";
import { getEnv } from "@/lib/env";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function StaffDashboardPage() {
  const env = getEnv();
  const hasSession = await isStaffSessionValid(env.STAFF_AUTH_SECRET);
  if (!hasSession) {
    redirect("/staff/login");
  }

  const scanWindowStart = new Date();
  scanWindowStart.setHours(scanWindowStart.getHours() - 24);

  const [todayTotal, todayValid, todayDuplicate, todayInvalid, todayRevoked, recentEvents] =
    await Promise.all([
      prisma.scanLog.count({
        where: {
          scannedAt: {
            gte: scanWindowStart,
          },
        },
      }),
      prisma.scanLog.count({
        where: {
          result: ScanResult.VALID,
          scannedAt: {
            gte: scanWindowStart,
          },
        },
      }),
      prisma.scanLog.count({
        where: {
          result: ScanResult.DUPLICATE,
          scannedAt: {
            gte: scanWindowStart,
          },
        },
      }),
      prisma.scanLog.count({
        where: {
          result: ScanResult.INVALID,
          scannedAt: {
            gte: scanWindowStart,
          },
        },
      }),
      prisma.scanLog.count({
        where: {
          result: ScanResult.REVOKED,
          scannedAt: {
            gte: scanWindowStart,
          },
        },
      }),
      prisma.event.findMany({
        where: { isActive: true },
        orderBy: { startAt: "asc" },
        take: 5,
        select: {
          id: true,
          name: true,
          code: true,
          startAt: true,
          venue: true,
        },
      }),
    ]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#edf3fb] via-[#f7fbff] to-[#f3f7ff] px-4 py-8">
      <div className="mx-auto grid w-full max-w-6xl gap-5">
        <header className="flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-cyan-100/40 bg-gradient-to-r from-[#063263] via-[#1877F2] to-[#00CDC4] px-6 py-5 text-white shadow-[0_18px_42px_-24px_rgba(6,50,99,0.7)]">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-white/80">Staff Console</p>
            <h1 className="mt-1 text-2xl font-semibold text-white">Dashboard</h1>
            <p className="mt-1 text-sm text-white/85">
              Operations overview and quick access to registration monitoring.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/staff/registrations"
              className="rounded-xl border border-white/45 bg-white/15 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/25"
            >
              View Registrations
            </Link>
            <StaffLogoutButton className="rounded-xl border border-white/45 bg-white/15 px-3 py-2 text-sm font-medium text-white transition hover:bg-white/25" />
          </div>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <MetricCard title="Total Scans (24h)" value={todayTotal} tone="slate" />
          <MetricCard title="Valid" value={todayValid} tone="green" />
          <MetricCard title="Duplicate" value={todayDuplicate} tone="amber" />
          <MetricCard title="Invalid" value={todayInvalid} tone="red" />
          <MetricCard title="Revoked" value={todayRevoked} tone="red" />
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Active Events</h2>
          <div className="mt-3 overflow-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2 pr-4 font-medium">Event</th>
                  <th className="py-2 pr-4 font-medium">Code</th>
                  <th className="py-2 pr-4 font-medium">Start</th>
                  <th className="py-2 pr-4 font-medium">Venue</th>
                </tr>
              </thead>
              <tbody>
                {recentEvents.map((event) => (
                  <tr key={event.id} className="border-b border-slate-100">
                    <td className="py-2 pr-4">{event.name}</td>
                    <td className="py-2 pr-4">{event.code}</td>
                    <td className="py-2 pr-4">{new Date(event.startAt).toLocaleString()}</td>
                    <td className="py-2 pr-4">{event.venue || "-"}</td>
                  </tr>
                ))}
                {recentEvents.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-4 text-slate-500">
                      No active events.
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
  tone: "slate" | "green" | "amber" | "red";
};

function MetricCard({ title, value, tone }: MetricCardProps) {
  const toneMap = {
    slate: "border-slate-200 bg-white text-slate-900",
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

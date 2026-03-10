import { redirect } from "next/navigation";
import Link from "next/link";

import { isStaffSessionValid } from "@/lib/auth";
import { getEnv } from "@/lib/env";
import { StaffCheckInClient } from "@/components/staff-checkin-client";
import { StaffLogoutButton } from "@/components/staff-logout-button";

export const dynamic = "force-dynamic";

export default async function StaffCheckInPage() {
  const env = getEnv();
  const hasSession = await isStaffSessionValid(env.STAFF_AUTH_SECRET);

  if (!hasSession) {
    redirect("/staff/login");
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="mx-auto grid w-full max-w-6xl gap-5">
        <header className="flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Staff Console</p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-900">Check-In Scanner</h1>
            <p className="mt-1 text-sm text-slate-600">
              Browser camera scanner with duplicate protection and full scan logging.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/staff/dashboard"
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Dashboard
            </Link>
            <StaffLogoutButton />
          </div>
        </header>

        <StaffCheckInClient />
      </div>
    </main>
  );
}

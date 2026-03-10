"use client";

import { useRouter } from "next/navigation";

export function StaffLogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/staff/logout", {
      method: "POST",
    });
    router.replace("/staff/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
    >
      Logout
    </button>
  );
}

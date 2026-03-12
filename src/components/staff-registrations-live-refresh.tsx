"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { formatDateTimePhnomPenh } from "@/lib/datetime";

type StaffRegistrationsLiveRefreshProps = {
  intervalMs?: number;
};

function shouldPauseForTyping(): boolean {
  const active = document.activeElement;
  if (!active) {
    return false;
  }
  const tag = active.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

export function StaffRegistrationsLiveRefresh({
  intervalMs = 5000,
}: StaffRegistrationsLiveRefreshProps) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  const intervalLabel = useMemo(() => `${Math.max(1, Math.round(intervalMs / 1000))}s`, [intervalMs]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const refreshOnce = () => {
      if (document.visibilityState !== "visible") {
        return;
      }
      if (shouldPauseForTyping()) {
        return;
      }
      setRefreshing(true);
      router.refresh();
      setLastSyncedAt(new Date());
      window.setTimeout(() => setRefreshing(false), 450);
    };

    const timer = window.setInterval(refreshOnce, intervalMs);
    return () => {
      window.clearInterval(timer);
    };
  }, [enabled, intervalMs, router]);

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-white/85">
      <span
        className={`inline-block h-2 w-2 rounded-full ${
          enabled ? "bg-emerald-300" : "bg-slate-300"
        } ${refreshing ? "animate-pulse" : ""}`}
      />
      <span>
        {enabled ? `Live updates every ${intervalLabel}` : "Live updates paused"}
      </span>
      {lastSyncedAt ? (
        <span className="text-white/70">Last sync: {formatDateTimePhnomPenh(lastSyncedAt)}</span>
      ) : null}
      <button
        type="button"
        onClick={() => setEnabled((prev) => !prev)}
        className="rounded-md border border-white/40 bg-white/10 px-2 py-1 font-medium text-white transition hover:bg-white/20"
      >
        {enabled ? "Pause" : "Resume"}
      </button>
    </div>
  );
}


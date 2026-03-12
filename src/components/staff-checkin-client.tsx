"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { formatDateTimePhnomPenh } from "@/lib/datetime";

type ScanStatus = "VALID" | "DUPLICATE" | "INVALID" | "REVOKED";

type CheckInApiResult = {
  status: ScanStatus;
  message: string;
  checkedInAt?: string;
  participant?: {
    fullName: string;
    email: string;
    organization: string | null;
    eventName: string;
    eventCode: string;
    ticketCode: string;
  };
};

type ScanLog = {
  id: string;
  status: ScanStatus;
  reason: string | null;
  attemptedAt: string;
  scannerName: string | null;
  attemptedValue: string;
  ticketCode: string | null;
  registrationName: string | null;
  eventName: string | null;
  checkedInAt: string | null;
};

function statusToneClass(status: ScanStatus): string {
  if (status === "VALID") {
    return "border-emerald-200 bg-emerald-50 text-emerald-900";
  }
  if (status === "DUPLICATE") {
    return "border-amber-200 bg-amber-50 text-amber-900";
  }
  return "border-red-200 bg-red-50 text-red-900";
}

export function StaffCheckInClient() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scannerControlsRef = useRef<{ stop: () => void } | null>(null);
  const scannerReaderRef = useRef<{ reset: () => void } | null>(null);
  const inFlightRef = useRef(false);
  const lastScanRef = useRef<{ value: string; at: number }>({ value: "", at: 0 });

  const [operatorLabel, setOperatorLabel] = useState("Main Entrance");
  const [manualInput, setManualInput] = useState("");
  const [cameraActive, setCameraActive] = useState(false);
  const [loadingCamera, setLoadingCamera] = useState(false);
  const [result, setResult] = useState<CheckInApiResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<ScanLog[]>([]);

  const loadLogs = useCallback(async () => {
    const response = await fetch("/api/staff/check-in", { method: "GET", cache: "no-store" });
    if (!response.ok) {
      return;
    }
    const data = (await response.json()) as { logs: ScanLog[] };
    setLogs(data.logs);
  }, []);

  const submitScan = useCallback(
    async (scanInput: string) => {
      const trimmedInput = scanInput.trim();
      if (!trimmedInput || inFlightRef.current) {
        return;
      }

      inFlightRef.current = true;
      setError(null);
      setResult(null);

      try {
        const response = await fetch("/api/staff/check-in", {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            scanInput: trimmedInput,
            operatorLabel,
          }),
        });

        const payload = (await response.json()) as CheckInApiResult & { error?: string };
        if (!response.ok) {
          throw new Error(payload.error || "Scan submission failed.");
        }

        setResult(payload);
        await loadLogs();
      } catch (scanError) {
        const message = scanError instanceof Error ? scanError.message : "Scan failed.";
        setError(message);
      } finally {
        inFlightRef.current = false;
      }
    },
    [loadLogs, operatorLabel],
  );

  const handleDecodedValue = useCallback(
    (value: string) => {
      const now = Date.now();
      if (value === lastScanRef.current.value && now - lastScanRef.current.at < 2000) {
        return;
      }
      lastScanRef.current = { value, at: now };
      void submitScan(value);
    },
    [submitScan],
  );

  async function startCamera() {
    if (cameraActive || loadingCamera || !videoRef.current) {
      return;
    }

    setLoadingCamera(true);
    setError(null);

    try {
      const { BrowserMultiFormatReader } = await import("@zxing/browser");
      const reader = new BrowserMultiFormatReader();
      scannerReaderRef.current = reader as unknown as { reset: () => void };

      const controls = await reader.decodeFromVideoDevice(
        undefined,
        videoRef.current,
        (resultValue) => {
          if (resultValue) {
            handleDecodedValue(resultValue.getText());
          }
        },
      );

      scannerControlsRef.current = controls as unknown as { stop: () => void };
      setCameraActive(true);
    } catch (cameraError) {
      const message = cameraError instanceof Error ? cameraError.message : "Unable to start camera.";
      setError(message);
      setCameraActive(false);
    } finally {
      setLoadingCamera(false);
    }
  }

  const stopCamera = useCallback(() => {
    scannerControlsRef.current?.stop();
    scannerReaderRef.current?.reset();
    scannerControlsRef.current = null;
    scannerReaderRef.current = null;
    setCameraActive(false);
  }, []);

  async function handleManualSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitScan(manualInput);
    setManualInput("");
  }

  useEffect(() => {
    void loadLogs();
    const interval = setInterval(() => {
      void loadLogs();
    }, 6000);
    return () => clearInterval(interval);
  }, [loadLogs]);

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  return (
    <div className="grid gap-6">
      <section className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto] sm:items-end">
          <label className="grid gap-1 text-sm text-slate-700">
            Operator label
            <input
              value={operatorLabel}
              onChange={(event) => setOperatorLabel(event.target.value)}
              className="rounded-xl border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
            />
          </label>
          <button
            type="button"
            onClick={startCamera}
            disabled={cameraActive || loadingCamera}
            className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {loadingCamera ? "Starting..." : cameraActive ? "Camera Active" : "Start Camera"}
          </button>
          <button
            type="button"
            onClick={stopCamera}
            disabled={!cameraActive}
            className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Stop Camera
          </button>
        </div>
        <video ref={videoRef} className="h-72 w-full rounded-xl bg-slate-950 object-cover" muted />
        <p className="text-xs text-slate-500">
          Camera scans QR payloads. Manual mode also accepts raw ticket codes.
        </p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Manual Scan Fallback</h2>
        <form onSubmit={handleManualSubmit} className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
          <input
            value={manualInput}
            onChange={(event) => setManualInput(event.target.value)}
            placeholder="Enter ticket code or paste QR payload"
            className="rounded-xl border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-800"
          >
            Submit Scan
          </button>
        </form>
      </section>

      {result ? (
        <section className={`rounded-2xl border p-5 shadow-sm ${statusToneClass(result.status)}`}>
          <h2 className="text-2xl font-bold">{result.status}</h2>
          <p className="mt-1 text-sm">{result.message}</p>
          {result.participant ? (
            <div className="mt-3 grid gap-1 text-sm">
              <p>Name: {result.participant.fullName}</p>
              <p>
                Event: {result.participant.eventName} ({result.participant.eventCode})
              </p>
              <p>Email: {result.participant.email}</p>
              <p>Ticket: {result.participant.ticketCode}</p>
              {result.checkedInAt ? <p>Checked in at (Phnom Penh): {formatDateTimePhnomPenh(result.checkedInAt)}</p> : null}
            </div>
          ) : null}
        </section>
      ) : null}

      {error ? <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Recent Scan Attempts</h2>
        <div className="mt-3 overflow-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2 pr-4 font-medium">Time (Phnom Penh)</th>
                <th className="py-2 pr-4 font-medium">Status</th>
                <th className="py-2 pr-4 font-medium">Event</th>
                <th className="py-2 pr-4 font-medium">Participant</th>
                <th className="py-2 pr-4 font-medium">Ticket</th>
                <th className="py-2 pr-4 font-medium">Input</th>
                <th className="py-2 pr-4 font-medium">Scanner</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-slate-100">
                  <td className="py-2 pr-4">{formatDateTimePhnomPenh(log.attemptedAt)}</td>
                  <td className="py-2 pr-4">{log.status}</td>
                  <td className="py-2 pr-4">{log.eventName || "-"}</td>
                  <td className="py-2 pr-4">{log.registrationName || "-"}</td>
                  <td className="py-2 pr-4">{log.ticketCode || "-"}</td>
                  <td className="max-w-[260px] py-2 pr-4">
                    <span className="block truncate" title={log.attemptedValue}>
                      {log.attemptedValue}
                    </span>
                  </td>
                  <td className="py-2 pr-4">{log.scannerName || "-"}</td>
                </tr>
              ))}
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-4 text-slate-500">
                    No logs yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

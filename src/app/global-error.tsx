"use client";

import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-100 text-slate-900">
        <main className="px-4 py-16">
          <div className="mx-auto max-w-2xl rounded-2xl border border-rose-200 bg-white p-8 shadow-sm">
            <p className="text-xs uppercase tracking-[0.18em] text-rose-700">Application Error</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">Unexpected server error</h1>
            <p className="mt-3 text-sm text-slate-600">
              The app hit an unexpected issue. Retry, or return to home.
            </p>
            <p className="mt-2 text-xs text-slate-500">Error reference: {error.digest ?? "N/A"}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => reset()}
                className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-700"
              >
                Retry
              </button>
              <Link
                href="/"
                className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Home
              </Link>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}

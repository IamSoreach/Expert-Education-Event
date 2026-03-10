"use client";

import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section className="px-4 py-16">
      <div className="mx-auto max-w-2xl rounded-2xl border border-rose-200 bg-rose-50 p-8 shadow-sm">
        <p className="text-xs uppercase tracking-[0.18em] text-rose-700">500</p>
        <h1 className="mt-2 text-3xl font-semibold text-rose-900">Something went wrong</h1>
        <p className="mt-3 text-sm text-rose-800">
          We could not complete your request. Please try again.
        </p>
        <p className="mt-2 text-xs text-rose-700">Error reference: {error.digest ?? "N/A"}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-xl bg-rose-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-rose-800"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="rounded-xl border border-rose-300 px-4 py-2.5 text-sm font-medium text-rose-800 hover:bg-rose-100"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </section>
  );
}

import Link from "next/link";

export default function NotFound() {
  return (
    <section className="px-4 py-16">
      <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">404</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">Page not found</h1>
        <p className="mt-3 text-sm text-slate-600">
          The page you requested does not exist or may have moved.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/"
            className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-700"
          >
            Back to Home
          </Link>
          <Link
            href="/register"
            className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Go to Registration
          </Link>
        </div>
      </div>
    </section>
  );
}

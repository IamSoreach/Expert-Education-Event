import Link from "next/link";

export default function Home() {
  const projectName = process.env.EVENT_NAME ?? "Event Registration MVP";

  return (
    <section className="px-4 py-12">
      <div className="mx-auto grid w-full max-w-4xl gap-6">
        <header className="rounded-3xl bg-[var(--brand-primary)] px-8 py-10 text-white shadow-lg">
          <p className="text-sm uppercase tracking-[0.22em] text-white/80">MVP Base App</p>
          <h1 className="mt-3 text-3xl font-semibold leading-tight sm:text-4xl">{projectName}</h1>
          <p className="mt-3 max-w-2xl text-white/85">
            A single Next.js codebase for registration, Telegram ticketing, and browser-based staff check-in.
          </p>
        </header>

        <article className="theme-card p-6">
          <h2 className="text-xl font-semibold text-[var(--brand-ink)]">Scaffolded modules</h2>
          <ul className="mt-4 grid gap-2 text-sm text-[var(--brand-gray)]">
            <li>Public registration flow with API + validation</li>
            <li>Telegram Mini App-compatible registration route</li>
            <li>Telegram integration modules in internal server layer</li>
            <li>Prisma data layer for MySQL access</li>
            <li>Staff login and protected check-in pages</li>
          </ul>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/register"
              className="theme-button-primary px-4 py-2.5 text-sm"
            >
              Go to Registration
            </Link>
            <Link
              href="/staff/login"
              className="theme-button-secondary px-4 py-2.5 text-sm"
            >
              Staff Login
            </Link>
            <Link
              href="/telegram/register"
              className="theme-button-secondary px-4 py-2.5 text-sm"
            >
              Telegram Route
            </Link>
          </div>
        </article>
      </div>
    </section>
  );
}

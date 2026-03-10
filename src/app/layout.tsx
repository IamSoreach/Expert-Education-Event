import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Project Scaffold | Event Registration MVP",
  description: "Single-codebase Next.js scaffold for event registration, Telegram linking, and staff check-in.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <div className="min-h-screen bg-slate-100 text-slate-900">
          <header className="border-b border-slate-200 bg-white/95 backdrop-blur">
            <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3">
              <Link href="/" className="text-sm font-semibold tracking-wide text-slate-900">
                Event MVP Scaffold
              </Link>
              <nav className="flex items-center gap-4 text-sm text-slate-600">
                <Link href="/">Home</Link>
                <Link href="/register">Register</Link>
                <Link href="/telegram/register">Telegram</Link>
                <Link href="/staff/login">Staff</Link>
              </nav>
            </div>
          </header>
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}

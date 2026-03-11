import type { Metadata } from "next";
import Link from "next/link";
import { Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

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
      <body className={`${manrope.variable} antialiased`}>
        <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
          <header className="border-b border-[var(--brand-border)]">
            <div className="bg-[var(--brand-deep)] text-white">
              <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3">
                <Link href="/" className="text-xl font-semibold tracking-[0.01em]">
                  Expert Education Fair
                </Link>
              </div>
            </div>
            <div className="bg-white">
              <nav className="mx-auto flex w-full max-w-6xl items-center gap-5 px-4 py-3 text-sm font-semibold text-[var(--brand-muted)]">
                <Link href="/" className="hover:text-[var(--brand-ink)]">
                  Home
                </Link>
                <Link href="/register" className="hover:text-[var(--brand-ink)]">
                  Register
                </Link>
                <Link href="/telegram/register" className="hover:text-[var(--brand-ink)]">
                  Telegram
                </Link>
                <Link href="/staff/login" className="hover:text-[var(--brand-ink)]">
                  Staff
                </Link>
              </nav>
            </div>
          </header>
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}

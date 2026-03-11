import type { Metadata } from "next";
import { Poppins, Space_Grotesk } from "next/font/google";
import { FloatingHomeButton } from "@/components/floating-home-button";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  variable: "--font-poppins",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
  weight: ["500", "600", "700"],
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
      <body className={`${poppins.variable} ${spaceGrotesk.variable} antialiased`}>
        <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
          <main>{children}</main>
          <FloatingHomeButton />
        </div>
      </body>
    </html>
  );
}

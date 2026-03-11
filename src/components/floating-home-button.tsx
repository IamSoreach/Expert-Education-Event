"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function FloatingHomeButton() {
  const pathname = usePathname();

  if (!pathname || pathname === "/") {
    return null;
  }

  return (
    <Link
      href="/"
      aria-label="Go to home"
      className="fixed bottom-4 right-4 z-40 rounded-full bg-gradient-to-r from-[#063263] via-[#1877F2] to-[#00CDC4] px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_28px_-14px_rgba(6,50,99,0.85)] transition hover:scale-[1.02] hover:shadow-[0_16px_30px_-14px_rgba(6,50,99,0.95)] active:scale-[0.98]"
    >
      Home
    </Link>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { SyntheticEvent } from "react";

export type LandingEvent = {
  title: string;
  venue: string;
  date: string;
  time: string;
  tag: string;
  imageSrc: string;
  eventUrl: string;
};

type LandingHomeClientProps = {
  eventName: string;
  eventCode: string;
  upcomingEvents: LandingEvent[];
};

function handleFallbackImageError(event: SyntheticEvent<HTMLImageElement>) {
  const img = event.currentTarget;
  if (img.dataset.fallbackApplied === "1") {
    img.style.display = "none";
    return;
  }

  img.dataset.fallbackApplied = "1";
  img.src = "/landing/hero.png";
}

export function LandingHomeClient({ eventName, eventCode, upcomingEvents }: LandingHomeClientProps) {
  const carouselRef = useRef<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [logoFailed, setLogoFailed] = useState(false);

  const totalEvents = useMemo(() => upcomingEvents.length, [upcomingEvents.length]);

  useEffect(() => {
    const container = carouselRef.current;
    if (!container) {
      return;
    }

    const updateActiveIndex = () => {
      const cards = Array.from(
        container.querySelectorAll<HTMLElement>("[data-event-card='true']"),
      );
      if (cards.length === 0) {
        return;
      }

      const scrollLeft = container.scrollLeft;
      let closestIndex = 0;
      let smallestDelta = Number.POSITIVE_INFINITY;

      cards.forEach((card, index) => {
        const delta = Math.abs(card.offsetLeft - scrollLeft);
        if (delta < smallestDelta) {
          smallestDelta = delta;
          closestIndex = index;
        }
      });

      setActiveIndex(closestIndex);
    };

    updateActiveIndex();
    container.addEventListener("scroll", updateActiveIndex, { passive: true });
    window.addEventListener("resize", updateActiveIndex);

    return () => {
      container.removeEventListener("scroll", updateActiveIndex);
      window.removeEventListener("resize", updateActiveIndex);
    };
  }, [upcomingEvents.length]);

  const scrollToIndex = (index: number) => {
    const container = carouselRef.current;
    if (!container) {
      return;
    }

    const cards = container.querySelectorAll<HTMLElement>("[data-event-card='true']");
    const target = cards[index];
    if (!target) {
      return;
    }

    container.scrollTo({
      left: target.offsetLeft,
      behavior: "smooth",
    });
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#edf3fb] via-[#f7fbff] to-[#f3f7ff] px-3 pb-16 pt-8 sm:px-6">
      <div className="pointer-events-none absolute -left-32 top-28 hidden h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(circle,#9dd8ff_0%,#54b2ff_40%,transparent_72%)] opacity-35 blur-3xl md:block" />
      <div className="pointer-events-none absolute -right-36 top-20 hidden h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(circle,#8bf0e8_0%,#3bcbe8_40%,transparent_72%)] opacity-30 blur-3xl md:block" />
      <div className="pointer-events-none absolute bottom-12 left-1/2 hidden h-72 w-[36rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,#c7ddff_0%,transparent_70%)] opacity-45 blur-3xl md:block" />

      <div className="mx-auto w-full max-w-md sm:max-w-xl lg:max-w-2xl">
        <div className="overflow-hidden rounded-[2rem] border border-white/70 bg-white shadow-[0_28px_70px_-38px_rgba(6,50,99,0.45)]">
          <header className="bg-gradient-to-r from-[#0D5AA7] via-[#1877F2] to-[#1ECBC7] px-5 pb-5 pt-3 text-white">
            <div className="flex items-center justify-center rounded-2xl bg-white/20 px-3 py-2.5">
              {!logoFailed ? (
                <img
                  src="/landing/logo.svg"
                  alt="Event logo"
                  className="h-9 w-auto object-contain object-left drop-shadow-[0_5px_14px_rgba(3,18,40,0.45)]"
                  onError={() => setLogoFailed(true)}
                />
              ) : (
                <span className="font-display text-base font-semibold tracking-wide text-white">
                  Expert Education
                </span>
              )}
            </div>

            <div className="mt-4 text-center">
              <h1 className="font-display text-[1.9rem] font-semibold leading-tight tracking-tight sm:text-[2.2rem]">
                {eventName}
              </h1>
              <p className="text-[0.82rem] tracking-[0.12em] text-white/85 sm:text-sm">mini app</p>
            </div>
          </header>

          <div className="relative h-72 overflow-hidden bg-[radial-gradient(circle_at_18%_10%,#45A6FF_0%,#1E82E8_40%,#0E62BE_100%)] sm:h-80">
            <img
              src="/landing/hero.png"
              alt="Hero visual"
              className="h-full w-full object-cover object-center"
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
          </div>

          <div className="px-5 pb-7 pt-8">
            <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
              <Link
                href={`/register/${encodeURIComponent(eventCode)}`}
                className="font-display palette-cycle-button-a rounded-2xl bg-gradient-to-r from-[#063263] via-[#1877F2] to-[#00CDC4] px-4 py-4 text-center text-base font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]"
              >
                New Registration
              </Link>
              <Link
                href={`/telegram/check-in/${encodeURIComponent(eventCode)}`}
                className="font-display palette-cycle-button-b rounded-2xl bg-gradient-to-r from-[#00CDC4] via-[#1877F2] to-[#063263] px-4 py-4 text-center text-base font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.52)]"
              >
                Check-in
              </Link>
            </div>

            <div className="mt-8">
              <h2 className="font-display text-[2.15rem] font-semibold tracking-tight text-[#1b2240] sm:text-[2.45rem]">
                Next Events
              </h2>
              <div className="mt-2 flex items-center justify-between">
                <p className="text-[0.72rem] font-medium uppercase tracking-[0.18em] text-[#4f6690]">
                  Swipe to view more
                </p>
                <p className="text-xs text-[#6c84ae]">{totalEvents} events</p>
              </div>

              <div
                ref={carouselRef}
                className="hide-scrollbar -mx-1 mt-4 overflow-x-auto pb-2"
              >
                <div className="flex snap-x snap-mandatory gap-3 px-1">
                  {upcomingEvents.map((event) => (
                    <article
                      key={`${event.title}-${event.date}`}
                      data-event-card="true"
                      className="min-w-full snap-center overflow-hidden rounded-[1.8rem] border border-slate-200 bg-white text-slate-900 shadow-[0_20px_38px_-28px_rgba(15,23,42,0.35)]"
                    >
                      <div className="relative h-44 overflow-hidden bg-slate-900 sm:h-48">
                        <img
                          src={event.imageSrc}
                          alt=""
                          aria-hidden
                          className="h-full w-full scale-110 object-cover opacity-45 blur-2xl"
                          onError={handleFallbackImageError}
                        />
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.16)_0%,rgba(255,255,255,0)_68%)]" />
                        <img
                          src={event.imageSrc}
                          alt={event.title}
                          className="absolute inset-0 h-full w-full object-contain p-2"
                          onError={handleFallbackImageError}
                        />
                      </div>
                      <div className="p-5">
                        <p className="font-display text-[1.58rem] font-semibold leading-tight tracking-tight text-[#1a1f34] sm:text-[1.74rem]">
                          {event.title}
                        </p>
                        <p className="mt-2 text-[1.02rem] font-medium leading-relaxed text-slate-800">
                          {event.venue}
                        </p>
                        <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold tracking-[0.04em] text-slate-700">
                            {event.tag}
                          </span>
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold tracking-[0.04em] text-slate-700">
                            {event.time}
                          </span>
                        </div>
                        <div className="mt-4 flex items-center gap-2 text-sm text-slate-700">
                          <span className="font-medium uppercase tracking-[0.08em] text-slate-500">Date</span>
                          <span className="font-semibold text-slate-800">{event.date}</span>
                        </div>
                        <a
                          href={event.eventUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="font-display palette-cycle-button mt-4 inline-flex rounded-full px-3 py-1.5 text-xs font-medium"
                        >
                          View Event
                        </a>
                      </div>
                    </article>
                  ))}
                </div>
              </div>

              <div className="mt-3 flex items-center justify-center gap-2">
                {upcomingEvents.map((event, index) => (
                  <button
                    key={`${event.title}-dot`}
                    type="button"
                    aria-label={`Go to event ${index + 1}`}
                    onClick={() => scrollToIndex(index)}
                    className={`h-2 rounded-full transition-all ${
                      index === activeIndex ? "w-8 bg-[#1877F2]" : "w-2 bg-[#7DB8FF]"
                    }`}
                  />
                ))}
              </div>
            </div>

            <div className="mt-6 h-12">
              <Link
                href="/staff/login"
                aria-label="Staff login"
                className="block h-full w-full rounded-2xl bg-transparent opacity-0"
              />
            </div>
          </div>
        </div>

        <footer className="px-4 pb-2 pt-4 text-center">
          <p className="text-[0.7rem] font-medium tracking-[0.04em] text-[#4f6690] sm:text-xs">
            All rights reserved by Expert Education and Visa Services Cambodia
          </p>
        </footer>
      </div>
    </section>
  );
}

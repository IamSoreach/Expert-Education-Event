import Image from "next/image";
import Link from "next/link";

import { getEnv } from "@/lib/env";

export default function Home() {
  const env = getEnv();
  const upcomingEvents = [
    {
      title: "University of Central Missouri Info Session",
      venue: "Ground Floor U06, 113C Mao Tse Tung Blvd, Street 245, BKK, Phnom Penh",
      date: "2026-03-21",
      time: "TBA",
      tag: "Info Session",
      imageSrc: "/landing/events/ucm-info-session.jpg",
      eventUrl: "https://www.facebook.com/events/1858556418142299/",
    },
    {
      title: "Federation University Info Session",
      venue: "Ground Floor U06, 113C Mao Tse Tung Blvd, Street 245, BKK, Phnom Penh",
      date: "2026-03-21",
      time: "TBA",
      tag: "Info Session",
      imageSrc: "/landing/events/federation-info-session.jpg",
      eventUrl: "https://www.facebook.com/events/810594012079045/",
    },
    {
      title: "Victoria University Info Session",
      venue: "Ground Floor U06, 113C Mao Tse Tung Blvd, Street 245, BKK, Phnom Penh",
      date: "2026-03-19",
      time: "TBA",
      tag: "Info Session",
      imageSrc: "/landing/events/victoria-info-session.jpg",
      eventUrl: "https://www.facebook.com/events/4633659466858081/",
    },
  ];

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#edf3fb] via-[#f7fbff] to-[#f3f7ff] px-3 pb-28 pt-8 sm:px-6">
      <div className="pointer-events-none absolute -left-32 top-28 hidden h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(circle,#9dd8ff_0%,#54b2ff_40%,transparent_72%)] opacity-35 blur-3xl md:block" />
      <div className="pointer-events-none absolute -right-36 top-20 hidden h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(circle,#8bf0e8_0%,#3bcbe8_40%,transparent_72%)] opacity-30 blur-3xl md:block" />
      <div className="pointer-events-none absolute bottom-12 left-1/2 hidden h-72 w-[36rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,#c7ddff_0%,transparent_70%)] opacity-45 blur-3xl md:block" />
      <div className="mx-auto w-full max-w-md sm:max-w-xl lg:max-w-2xl">
        <div className="overflow-hidden rounded-[2rem] border border-white/70 bg-white shadow-[0_28px_70px_-38px_rgba(6,50,99,0.45)]">
          <header className="bg-gradient-to-r from-[#0D5AA7] via-[#1877F2] to-[#1ECBC7] px-5 pb-5 pt-3 text-white">
            <div className="flex items-center justify-center rounded-2xl bg-white/20 px-3 py-2.5">
              <div className="flex items-center">
                <Image
                  src="/landing/logo.svg"
                  alt="Event logo"
                  width={160}
                  height={46}
                  className="h-9 w-auto object-contain object-left drop-shadow-[0_5px_14px_rgba(3,18,40,0.45)]"
                />
              </div>
            </div>
            <div className="mt-4 text-center">
              <h1 className="font-display text-[1.9rem] font-semibold leading-tight tracking-tight sm:text-[2.2rem]">
                {env.EVENT_NAME}
              </h1>
              <p className="text-[0.82rem] tracking-[0.12em] text-white/85 sm:text-sm">mini app</p>
            </div>
          </header>

          <div className="relative h-72 overflow-hidden bg-[radial-gradient(circle_at_18%_10%,#45A6FF_0%,#1E82E8_40%,#0E62BE_100%)] sm:h-80">
            <Image
              src="/landing/hero.png"
              alt="Hero visual"
              fill
              priority
              className="object-cover object-center"
            />
          </div>

          <div className="px-5 pb-7 pt-8">
            <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
              <Link
                href={`/register/${encodeURIComponent(env.EVENT_CODE)}`}
                className="font-display palette-cycle-button-a rounded-2xl px-4 py-4 text-center text-base font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]"
              >
                New Registration
              </Link>
              <Link
                href={`/telegram/check-in/${encodeURIComponent(env.EVENT_CODE)}`}
                className="font-display palette-cycle-button-b rounded-2xl px-4 py-4 text-center text-base font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.52)]"
              >
                Check-in
              </Link>
            </div>

            <div className="mt-8">
              <h2 className="font-display text-[2.15rem] font-semibold tracking-tight text-[#1b2240] sm:text-[2.45rem]">
                Next Events
              </h2>
              <div className="mt-2 flex items-center justify-between">
                <p className="text-[0.72rem] font-medium uppercase tracking-[0.18em] text-[#4f6690]">Swipe to view more</p>
                <p className="text-xs text-[#6c84ae]">{upcomingEvents.length} events</p>
              </div>

              <div className="hide-scrollbar -mx-1 mt-4 overflow-x-auto pb-2">
                <div className="flex snap-x snap-mandatory gap-3 px-1">
                  {upcomingEvents.map((event) => (
                    <article
                      key={`${event.title}-${event.date}`}
                      className="min-w-full snap-center overflow-hidden rounded-[1.8rem] border border-slate-200 bg-white text-slate-900 shadow-[0_20px_38px_-28px_rgba(15,23,42,0.35)]"
                    >
                      <div className="relative h-44 overflow-hidden bg-slate-900 sm:h-48">
                        <Image
                          src={event.imageSrc}
                          alt=""
                          aria-hidden
                          fill
                          sizes="(max-width: 640px) 100vw, 640px"
                          className="scale-110 object-cover opacity-45 blur-2xl"
                        />
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.16)_0%,rgba(255,255,255,0)_68%)]" />
                        <Image
                          src={event.imageSrc}
                          alt={event.title}
                          fill
                          sizes="(max-width: 640px) 100vw, 640px"
                          className="object-contain p-2"
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
                <span className="h-2 w-8 rounded-full bg-[#1877F2]" />
                <span className="h-2 w-2 rounded-full bg-[#7DB8FF]" />
                <span className="h-2 w-2 rounded-full bg-[#7DB8FF]" />
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

        <nav className="fixed bottom-4 left-1/2 z-20 block w-[min(94vw,460px)] -translate-x-1/2 rounded-full border border-white/70 bg-white/90 p-2 shadow-[0_16px_42px_-26px_rgba(7,21,52,0.75)] backdrop-blur lg:hidden">
          <div className="grid grid-cols-4 gap-2 text-center text-xs font-semibold text-[#5e6d8d]">
            <Link href="/" className="rounded-full bg-[#f1f5ff] px-3 py-2 text-[#0d1f44]">
              Home
            </Link>
            <Link
              href={`/register/${encodeURIComponent(env.EVENT_CODE)}`}
              className="rounded-full px-3 py-2 transition hover:bg-[#f1f5ff]"
            >
              Register
            </Link>
            <Link
              href={`/telegram/check-in/${encodeURIComponent(env.EVENT_CODE)}`}
              className="rounded-full px-3 py-2 transition hover:bg-[#f1f5ff]"
            >
              Check-in
            </Link>
            <Link href="/staff/login" className="rounded-full px-3 py-2 transition hover:bg-[#f1f5ff]">
              Staff
            </Link>
          </div>
        </nav>
      </div>
    </section>
  );
}

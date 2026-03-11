import { LandingHomeClient, type LandingEvent } from "@/components/landing-home-client";
import { getEnv } from "@/lib/env";

export default function Home() {
  const env = getEnv();

  const upcomingEvents: LandingEvent[] = [
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
    <LandingHomeClient
      eventName={env.EVENT_NAME}
      eventCode={env.EVENT_CODE}
      upcomingEvents={upcomingEvents}
    />
  );
}

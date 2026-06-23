import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, SeatTier } from "../src/generated/prisma/client";

try {
  process.loadEnvFile();
} catch {
  // Fall back to the ambient environment.
}

function daysFromNow(days: number, hour: number): Date {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  date.setUTCHours(hour, 0, 0, 0);
  return date;
}

async function wipe(prisma: PrismaClient): Promise<void> {
  // Demo seed is destructive — clear domain tables in FK-safe order.
  await prisma.clubNote.deleteMany();
  await prisma.supportTicket.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.session.deleteMany();
  await prisma.member.deleteMany();
  await prisma.hall.deleteMany();
  await prisma.movie.deleteMany();
}

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

  await wipe(prisma);

  const movieData = [
    { title: "Nightcrawler", durationMin: 117, releaseYear: 2014 },
    { title: "The Conjuring", durationMin: 112, releaseYear: 2013 },
    { title: "Akira", durationMin: 124, releaseYear: 1988 },
    { title: "Pulp Fiction", durationMin: 154, releaseYear: 1994 },
    { title: "Blade Runner: The Final Cut", durationMin: 117, releaseYear: 2007 },
    { title: "The Godfather", durationMin: 175, releaseYear: 1972 },
    { title: "Goodfellas", durationMin: 145, releaseYear: 1990 },
    { title: "Friday the 13th", durationMin: 95, releaseYear: 1980 },
  ];
  const movies = await Promise.all(
    movieData.map((data) => prisma.movie.create({ data, select: { id: true, title: true } })),
  );
  const movieByTitle = new Map(movies.map((m) => [m.title, m.id]));
  const id = (title: string): string => {
    const movieId = movieByTitle.get(title);
    if (!movieId) {
      throw new Error(`Seed movie not found: ${title}`);
    }
    return movieId;
  };

  const grand = await prisma.hall.create({
    data: {
      name: "Grand Hall",
      seats: {
        create: [
          // Stable id so the Bruno collection (and demos) can target a known seat.
          { id: "demo-seat", rowLabel: "A", number: 1, tier: "PREMIUM" },
          ...range(2, 4).map((n) => seat("A", n, "PREMIUM")),
          ...range(1, 6).map((n) => seat("B", n, "RECLINER")),
          ...range(1, 8).map((n) => seat("C", n, "STANDARD")),
        ],
      },
      cabins: { create: [{ name: "Family Cabin", capacity: 4 }, { name: "Crew Cabin", capacity: 6 }] },
    },
    select: { id: true },
  });

  const underground = await prisma.hall.create({
    data: {
      name: "Underground",
      seats: {
        create: [
          ...range(1, 4).map((n) => seat("A", n, "RECLINER")),
          ...range(1, 6).map((n) => seat("B", n, "STANDARD")),
        ],
      },
      cabins: { create: [{ name: "Speakeasy Booth", capacity: 4 }] },
    },
    select: { id: true },
  });

  const sessions = [
    {
      id: "demo-session",
      hallId: grand.id,
      kind: "GENRE_BLOCK" as const,
      startsAt: daysFromNow(3, 20),
      durationH: 4,
      minLoyaltyDegree: 0,
      earlyAccessUntil: null,
      prices: [1200, 2200, 3500, 12000] as const,
      movies: ["The Conjuring", "Friday the 13th"],
    },
    {
      hallId: underground.id,
      kind: "COMBO" as const,
      startsAt: daysFromNow(5, 19),
      durationH: 5,
      minLoyaltyDegree: 0,
      earlyAccessUntil: null,
      prices: [1000, 1800, 3000, 9000] as const,
      movies: ["Akira", "Pulp Fiction"],
    },
    {
      hallId: grand.id,
      kind: "MARATHON" as const,
      startsAt: daysFromNow(7, 16),
      durationH: 8,
      minLoyaltyDegree: 0,
      earlyAccessUntil: null,
      prices: [1500, 2500, 4000, 14000] as const,
      movies: ["Friday the 13th", "The Conjuring", "Nightcrawler"],
    },
    {
      hallId: grand.id,
      kind: "SPECIAL_CUT" as const,
      startsAt: daysFromNow(10, 21),
      durationH: 3,
      minLoyaltyDegree: 0,
      earlyAccessUntil: null,
      prices: [1400, 2400, 3800, 13000] as const,
      movies: ["Blade Runner: The Final Cut"],
    },
    {
      hallId: grand.id,
      kind: "SPECIAL_EVENT" as const,
      startsAt: daysFromNow(14, 20),
      durationH: 4,
      minLoyaltyDegree: 5,
      earlyAccessUntil: daysFromNow(12, 20),
      prices: [2500, 3500, 5000, 18000] as const,
      movies: ["The Godfather", "Goodfellas"],
    },
    {
      hallId: underground.id,
      kind: "PREMIERE" as const,
      startsAt: daysFromNow(20, 21),
      durationH: 3,
      minLoyaltyDegree: 3,
      earlyAccessUntil: daysFromNow(18, 21),
      prices: [2000, 3000, 4500, 16000] as const,
      movies: ["Nightcrawler"],
    },
  ];

  for (const s of sessions) {
    await prisma.session.create({
      data: {
        ...("id" in s ? { id: s.id } : {}),
        hallId: s.hallId,
        kind: s.kind,
        startsAt: s.startsAt,
        endsAt: new Date(s.startsAt.getTime() + s.durationH * 60 * 60 * 1000),
        minLoyaltyDegree: s.minLoyaltyDegree,
        earlyAccessUntil: s.earlyAccessUntil,
        basePriceStandardCents: s.prices[0],
        basePriceReclinerCents: s.prices[1],
        basePricePremiumCents: s.prices[2],
        cabinPriceCents: s.prices[3],
        movies: { create: s.movies.map((title, index) => ({ movieId: id(title), position: index + 1 })) },
      },
    });
  }

  const membershipWindow = { validFrom: daysFromNow(-30, 0), validUntil: daysFromNow(335, 0) };
  await prisma.member.create({
    data: {
      userId: "u-boss",
      displayName: "Don Corleone",
      loyaltyDegree: 8,
      membership: { create: { tier: "PRO", status: "ACTIVE", guestQuota: 4, ...membershipWindow } },
    },
  });
  await prisma.member.create({
    data: {
      userId: "u-capo",
      displayName: "Capo Regime",
      loyaltyDegree: 4,
      membership: { create: { tier: "PLUS", status: "ACTIVE", guestQuota: 2, ...membershipWindow } },
    },
  });
  await prisma.member.create({
    data: {
      userId: "u-associate",
      displayName: "Associate",
      loyaltyDegree: 1,
      membership: { create: { tier: "BASIC", status: "ACTIVE", guestQuota: 1, ...membershipWindow } },
    },
  });
  await prisma.member.create({
    data: { userId: "u-rookie", displayName: "Rookie", loyaltyDegree: 0 },
  });
  await prisma.member.create({
    data: {
      userId: "u-lapsed",
      displayName: "Lapsed Member",
      loyaltyDegree: 2,
      membership: {
        create: {
          tier: "PLUS",
          status: "EXPIRED",
          guestQuota: 2,
          validFrom: daysFromNow(-400, 0),
          validUntil: daysFromNow(-30, 0),
        },
      },
    },
  });

  const counts = {
    movies: await prisma.movie.count(),
    halls: await prisma.hall.count(),
    sessions: await prisma.session.count(),
    members: await prisma.member.count(),
  };
  console.log("Seed complete:", counts);
  console.log("Demo users: u-boss (PRO/8), u-capo (PLUS/4), u-associate (BASIC/1), u-rookie (no membership), u-lapsed (EXPIRED)");
  await prisma.$disconnect();
}

function range(from: number, to: number): number[] {
  return Array.from({ length: to - from + 1 }, (_, i) => from + i);
}

function seat(rowLabel: string, number: number, tier: SeatTier): { rowLabel: string; number: number; tier: SeatTier } {
  return { rowLabel, number, tier };
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

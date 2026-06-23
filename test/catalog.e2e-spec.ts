import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppModule } from "../src/app.module";
import { configureApp } from "../src/app.setup";
import { PrismaService } from "../src/common/prisma/prisma.service";

describe("Catalog (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let hallId: string;
  let sessionId: string;
  const movieIds: string[] = [];

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);

    const hall = await prisma.hall.create({
      data: {
        name: "E2E Hall",
        seats: {
          create: [
            { rowLabel: "A", number: 1, tier: "STANDARD" },
            { rowLabel: "A", number: 2, tier: "PREMIUM" },
          ],
        },
        cabins: { create: [{ name: "Cabin 1", capacity: 4 }] },
      },
    });
    hallId = hall.id;

    const first = await prisma.movie.create({ data: { title: "E2E Movie A", durationMin: 100 } });
    const second = await prisma.movie.create({ data: { title: "E2E Movie B", durationMin: 90 } });
    movieIds.push(first.id, second.id);

    const session = await prisma.session.create({
      data: {
        hallId,
        kind: "MARATHON",
        startsAt: new Date("2999-01-01T18:00:00.000Z"),
        endsAt: new Date("2999-01-01T22:00:00.000Z"),
        minLoyaltyDegree: 0,
        basePriceStandardCents: 1500,
        basePriceReclinerCents: 2500,
        basePricePremiumCents: 4000,
        cabinPriceCents: 12000,
        movies: {
          create: [
            { movieId: first.id, position: 1 },
            { movieId: second.id, position: 2 },
          ],
        },
      },
    });
    sessionId = session.id;
  });

  afterAll(async () => {
    await prisma.session.deleteMany({ where: { id: sessionId } });
    await prisma.movie.deleteMany({ where: { id: { in: movieIds } } });
    await prisma.hall.deleteMany({ where: { id: hallId } });
    await app.close();
  });

  it("GET /api/v1/sessions includes the seeded session with bundle + prices", async () => {
    const response = await request(app.getHttpServer()).get("/api/v1/sessions").expect(200);
    const body = response.body as Array<{ id: string; movies: unknown[] }>;
    const session = body.find((s) => s.id === sessionId);
    expect(session).toMatchObject({
      kind: "MARATHON",
      basePriceStandardCents: 1500,
      cabinPriceCents: 12000,
      hall: { id: hallId, name: "E2E Hall" },
    });
    expect(session?.movies).toHaveLength(2);
  });

  it("GET /api/v1/sessions filters by kind", async () => {
    const response = await request(app.getHttpServer())
      .get("/api/v1/sessions?kind=PREMIERE")
      .expect(200);
    expect((response.body as Array<{ id: string }>).some((s) => s.id === sessionId)).toBe(false);
  });

  it("GET /api/v1/sessions/:id returns hall layout, ordered bundle and availability", async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/v1/sessions/${sessionId}`)
      .expect(200);
    const body = response.body as {
      hall: { seats: unknown[]; cabins: unknown[] };
      movies: Array<{ position: number }>;
      takenSeatIds: string[];
    };
    expect(body.hall.seats).toHaveLength(2);
    expect(body.hall.cabins).toHaveLength(1);
    expect(body.movies.map((m) => m.position)).toEqual([1, 2]);
    expect(body.takenSeatIds).toEqual([]);
  });

  it("GET /api/v1/sessions/:id returns 404 for an unknown id", async () => {
    await request(app.getHttpServer()).get("/api/v1/sessions/does-not-exist").expect(404);
  });
});

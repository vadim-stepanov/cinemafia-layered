import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppModule } from "../src/app.module";
import { configureApp } from "../src/app.setup";
import { PaymentService } from "../src/common/payment/payment.service";
import { PrismaService } from "../src/common/prisma/prisma.service";

const FAR_FUTURE = new Date("2999-01-01T18:00:00.000Z");
const FAR_FUTURE_END = new Date("2999-01-01T22:00:00.000Z");

async function seedHallWithSession(
  prisma: PrismaService,
  opts: { minLoyaltyDegree?: number } = {},
): Promise<{ hallId: string; sessionId: string; seatIds: string[] }> {
  const hall = await prisma.hall.create({
    data: {
      name: "BK Hall",
      seats: {
        create: [
          { rowLabel: "A", number: 1, tier: "STANDARD" },
          { rowLabel: "A", number: 2, tier: "PREMIUM" },
          { rowLabel: "A", number: 3, tier: "STANDARD" },
        ],
      },
    },
    select: { id: true, seats: { orderBy: [{ number: "asc" }], select: { id: true } } },
  });
  const session = await prisma.session.create({
    data: {
      hallId: hall.id,
      kind: "PREMIERE",
      startsAt: FAR_FUTURE,
      endsAt: FAR_FUTURE_END,
      minLoyaltyDegree: opts.minLoyaltyDegree ?? 0,
      basePriceStandardCents: 1000,
      basePriceReclinerCents: 2000,
      basePricePremiumCents: 3000,
      cabinPriceCents: 10000,
    },
  });
  return { hallId: hall.id, sessionId: session.id, seatIds: hall.seats.map((s) => s.id) };
}

async function seedMember(
  prisma: PrismaService,
  userId: string,
  tier: "BASIC" | "PLUS" | "PRO",
  loyaltyDegree: number,
): Promise<void> {
  await prisma.member.create({
    data: {
      userId,
      displayName: userId,
      loyaltyDegree,
      membership: {
        create: {
          tier,
          status: "ACTIVE",
          guestQuota: 0,
          validFrom: new Date("2026-01-01T00:00:00.000Z"),
          validUntil: FAR_FUTURE,
        },
      },
    },
  });
}

async function cleanup(prisma: PrismaService, userIds: string[], hallIds: string[]): Promise<void> {
  await prisma.booking.deleteMany({ where: { member: { userId: { in: userIds } } } });
  await prisma.member.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.session.deleteMany({ where: { hallId: { in: hallIds } } });
  await prisma.hall.deleteMany({ where: { id: { in: hallIds } } });
}

describe("Booking (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const user1 = "bk-pro";
  const user2 = "bk-basic";
  let sessionId: string;
  let gatedSessionId: string;
  let hallIds: string[] = [];
  let seatIds: string[] = [];

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);

    const open = await seedHallWithSession(prisma);
    const gated = await seedHallWithSession(prisma, { minLoyaltyDegree: 99 });
    sessionId = open.sessionId;
    gatedSessionId = gated.sessionId;
    seatIds = open.seatIds;
    hallIds = [open.hallId, gated.hallId];

    await seedMember(prisma, user1, "PRO", 6);
    await seedMember(prisma, user2, "BASIC", 0);
  });

  afterAll(async () => {
    await cleanup(prisma, [user1, user2], hallIds);
    await app.close();
  });

  const hold = (userId: string, body: object) =>
    request(app.getHttpServer()).post("/api/v1/bookings/hold").set("X-User-Id", userId).send(body);

  it("canonical flow: hold (priced + discounted) → confirm → cancel", async () => {
    const held = await hold(user1, { sessionId, seatIds: [seatIds[0]] }).expect(201);
    expect(held.body).toMatchObject({
      status: "HELD",
      totalPriceCents: 900, // STANDARD 1000 − PRO 10%
    });
    expect(held.body.expiresAt).toBeTruthy();
    const bookingId = held.body.id as string;

    const confirmed = await request(app.getHttpServer())
      .post(`/api/v1/bookings/${bookingId}/confirm`)
      .set("X-User-Id", user1)
      .expect(200);
    expect(confirmed.body).toMatchObject({
      status: "CONFIRMED",
      payment: { status: "SUCCEEDED", amountCents: 900 },
    });

    const cancelled = await request(app.getHttpServer())
      .post(`/api/v1/bookings/${bookingId}/cancel`)
      .set("X-User-Id", user1)
      .expect(200);
    expect(cancelled.body).toMatchObject({ status: "CANCELLED", payment: { status: "REFUNDED" } });
  });

  it("403 when loyalty degree is below the session gate", async () => {
    await hold(user1, { sessionId: gatedSessionId, seatIds: [seatIds[0]] }).expect(403);
  });

  it("400 when guest count exceeds the effective quota", async () => {
    await hold(user1, { sessionId, seatIds: [seatIds[0]], guestCount: 999 }).expect(400);
  });

  it("400 when neither seats nor cabin are provided", async () => {
    await hold(user1, { sessionId }).expect(400);
  });

  it("409 when a seat is already held by another active booking", async () => {
    await hold(user1, { sessionId, seatIds: [seatIds[1]] }).expect(201);
    await hold(user2, { sessionId, seatIds: [seatIds[1]] }).expect(409);
  });

  it("contention race: exactly one of two concurrent holds wins the seat", async () => {
    const [a, b] = await Promise.all([
      hold(user1, { sessionId, seatIds: [seatIds[2]] }),
      hold(user2, { sessionId, seatIds: [seatIds[2]] }),
    ]);
    const codes = [a.status, b.status].sort();
    expect(codes).toEqual([201, 409]);
  });

  it("lists and fetches the caller's own bookings", async () => {
    const list = await request(app.getHttpServer())
      .get("/api/v1/bookings")
      .set("X-User-Id", user1)
      .expect(200);
    expect(Array.isArray(list.body)).toBe(true);
    expect(list.body.length).toBeGreaterThan(0);

    const id = (list.body as Array<{ id: string }>)[0].id;
    await request(app.getHttpServer())
      .get(`/api/v1/bookings/${id}`)
      .set("X-User-Id", user1)
      .expect(200);
  });

  it("401 without identity", async () => {
    await request(app.getHttpServer())
      .post("/api/v1/bookings/hold")
      .send({ sessionId, seatIds: [seatIds[0]] })
      .expect(401);
  });
});

describe("Booking confirm with failing payment (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const userId = "bk-fail";
  let sessionId: string;
  let seatIds: string[] = [];
  let hallIds: string[] = [];

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PaymentService)
      .useValue({
        charge: () => Promise.resolve({ outcome: "FAILED", providerRef: "pay_fail" }),
        refund: () => Promise.resolve({ providerRef: "rfnd_fail" }),
      })
      .compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);

    const seeded = await seedHallWithSession(prisma);
    sessionId = seeded.sessionId;
    seatIds = seeded.seatIds;
    hallIds = [seeded.hallId];
    await seedMember(prisma, userId, "BASIC", 0);
  });

  afterAll(async () => {
    await cleanup(prisma, [userId], hallIds);
    await app.close();
  });

  it("payment failure expires the hold and frees the seat", async () => {
    const held = await request(app.getHttpServer())
      .post("/api/v1/bookings/hold")
      .set("X-User-Id", userId)
      .send({ sessionId, seatIds: [seatIds[0]] })
      .expect(201);
    const bookingId = held.body.id as string;

    await request(app.getHttpServer())
      .post(`/api/v1/bookings/${bookingId}/confirm`)
      .set("X-User-Id", userId)
      .expect(402);

    const fetched = await request(app.getHttpServer())
      .get(`/api/v1/bookings/${bookingId}`)
      .set("X-User-Id", userId)
      .expect(200);
    expect(fetched.body.status).toBe("EXPIRED");

    // Seat is free again — a fresh hold on the same seat succeeds.
    await request(app.getHttpServer())
      .post("/api/v1/bookings/hold")
      .set("X-User-Id", userId)
      .send({ sessionId, seatIds: [seatIds[0]] })
      .expect(201);
  });
});

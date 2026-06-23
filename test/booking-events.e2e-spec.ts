import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppModule } from "../src/app.module";
import { configureApp } from "../src/app.setup";
import { PrismaService } from "../src/common/prisma/prisma.service";
import { BookingExpiryService } from "../src/modules/booking/booking-expiry.service";

const FAR_FUTURE = new Date("2999-01-01T18:00:00.000Z");
const FAR_FUTURE_END = new Date("2999-01-01T22:00:00.000Z");

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function seedHallSessionSeat(
  prisma: PrismaService,
): Promise<{ hallId: string; sessionId: string; seatId: string }> {
  const hall = await prisma.hall.create({
    data: { name: "EV Hall", seats: { create: [{ rowLabel: "A", number: 1, tier: "STANDARD" }] } },
    select: { id: true, seats: { select: { id: true } } },
  });
  const session = await prisma.session.create({
    data: {
      hallId: hall.id,
      kind: "PREMIERE",
      startsAt: FAR_FUTURE,
      endsAt: FAR_FUTURE_END,
      minLoyaltyDegree: 0,
      basePriceStandardCents: 1000,
      basePriceReclinerCents: 2000,
      basePricePremiumCents: 3000,
      cabinPriceCents: 10000,
    },
  });
  return { hallId: hall.id, sessionId: session.id, seatId: hall.seats[0].id };
}

describe("Booking events (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const expiryUser = "ev-expiry";
  const loyaltyUser = "ev-loyalty";
  const hallIds: string[] = [];

  async function seedMember(userId: string): Promise<string> {
    const member = await prisma.member.create({
      data: { userId, displayName: userId, loyaltyDegree: 0 },
    });
    return member.id;
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.booking.deleteMany({ where: { member: { userId: { in: [expiryUser, loyaltyUser] } } } });
    await prisma.member.deleteMany({ where: { userId: { in: [expiryUser, loyaltyUser] } } });
    await prisma.session.deleteMany({ where: { hallId: { in: hallIds } } });
    await prisma.hall.deleteMany({ where: { id: { in: hallIds } } });
    await app.close();
  });

  it("expiry sweep moves a past-TTL hold to EXPIRED and frees its seat", async () => {
    const { hallId, sessionId, seatId } = await seedHallSessionSeat(prisma);
    hallIds.push(hallId);
    const memberId = await seedMember(expiryUser);

    const booking = await prisma.booking.create({
      data: {
        memberId,
        sessionId,
        status: "HELD",
        guestCount: 0,
        totalPriceCents: 1000,
        expiresAt: new Date(Date.now() - 1000),
        seats: { create: [{ sessionId, seatId }] },
      },
    });

    const swept = await app.get(BookingExpiryService).sweepExpiredHolds();
    expect(swept).toBeGreaterThanOrEqual(1);

    const after = await prisma.booking.findUnique({
      where: { id: booking.id },
      select: { status: true, seats: { select: { active: true } } },
    });
    expect(after?.status).toBe("EXPIRED");
    expect(after?.seats[0].active).toBe(false);
  });

  it("BookingConfirmed accrues loyalty for the member", async () => {
    const { hallId, sessionId, seatId } = await seedHallSessionSeat(prisma);
    hallIds.push(hallId);
    const memberId = await seedMember(loyaltyUser);

    const held = await request(app.getHttpServer())
      .post("/api/v1/bookings/hold")
      .set("X-User-Id", loyaltyUser)
      .send({ sessionId, seatIds: [seatId] })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/bookings/${held.body.id as string}/confirm`)
      .set("X-User-Id", loyaltyUser)
      .expect(200);

    // Reaction is async (fire-and-forget event) — poll for the accrual.
    let degree = 0;
    for (let attempt = 0; attempt < 20 && degree < 1; attempt++) {
      const member = await prisma.member.findUnique({
        where: { id: memberId },
        select: { loyaltyDegree: true },
      });
      degree = member?.loyaltyDegree ?? 0;
      if (degree < 1) {
        await sleep(50);
      }
    }
    expect(degree).toBe(1);
  });
});

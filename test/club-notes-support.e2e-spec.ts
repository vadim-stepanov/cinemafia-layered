import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppModule } from "../src/app.module";
import { configureApp } from "../src/app.setup";
import { PrismaService } from "../src/common/prisma/prisma.service";

const FAR_FUTURE = new Date("2999-01-01T18:00:00.000Z");
const FAR_FUTURE_END = new Date("2999-01-01T22:00:00.000Z");

describe("Club Notes + Support (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const memberUser = "cn-member"; // active membership + confirmed booking
  const strangerUser = "cn-stranger"; // member profile, no active membership
  let sessionId: string;
  let hallId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);

    const hall = await prisma.hall.create({
      data: { name: "CN Hall", seats: { create: [{ rowLabel: "A", number: 1, tier: "STANDARD" }] } },
      select: { id: true, seats: { select: { id: true } } },
    });
    hallId = hall.id;
    const session = await prisma.session.create({
      data: {
        hallId,
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
    sessionId = session.id;

    // Active member with a CONFIRMED booking for the session.
    await prisma.member.create({
      data: {
        userId: memberUser,
        displayName: "Don Vito",
        loyaltyDegree: 3,
        membership: {
          create: {
            tier: "PRO",
            status: "ACTIVE",
            guestQuota: 0,
            validFrom: new Date("2026-01-01T00:00:00.000Z"),
            validUntil: FAR_FUTURE,
          },
        },
        bookings: {
          create: {
            sessionId,
            status: "CONFIRMED",
            guestCount: 0,
            totalPriceCents: 1000,
            confirmedAt: new Date("2026-02-01T00:00:00.000Z"),
            seats: { create: [{ sessionId, seatId: hall.seats[0].id }] },
          },
        },
      },
    });

    // Member profile without an active membership.
    await prisma.member.create({ data: { userId: strangerUser, displayName: "Outsider", loyaltyDegree: 0 } });
  });

  afterAll(async () => {
    await prisma.clubNote.deleteMany({ where: { session: { hallId } } });
    await prisma.supportTicket.deleteMany({ where: { member: { userId: { in: [memberUser] } } } });
    await prisma.booking.deleteMany({ where: { member: { userId: { in: [memberUser, strangerUser] } } } });
    await prisma.member.deleteMany({ where: { userId: { in: [memberUser, strangerUser] } } });
    await prisma.session.deleteMany({ where: { hallId } });
    await prisma.hall.deleteMany({ where: { id: hallId } });
    await app.close();
  });

  it("active member with a booking can post and read a club note", async () => {
    const created = await request(app.getHttpServer())
      .post(`/api/v1/sessions/${sessionId}/notes`)
      .set("X-User-Id", memberUser)
      .send({ body: "Loved the marathon." })
      .expect(201);
    expect(created.body).toMatchObject({ body: "Loved the marathon.", member: { displayName: "Don Vito" } });

    const list = await request(app.getHttpServer())
      .get(`/api/v1/sessions/${sessionId}/notes`)
      .set("X-User-Id", memberUser)
      .expect(200);
    expect((list.body as unknown[]).length).toBeGreaterThan(0);
  });

  it("non-member (no active membership) is forbidden from reading notes", async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/sessions/${sessionId}/notes`)
      .set("X-User-Id", strangerUser)
      .expect(403);
  });

  it("active member without a booking cannot post about the session", async () => {
    // strangerUser lacks active membership, so they already 403 on membership;
    // verify the booking gate with a fresh active member that never booked.
    await prisma.member.create({
      data: {
        userId: "cn-nobooking",
        displayName: "No Booking",
        loyaltyDegree: 0,
        membership: {
          create: {
            tier: "BASIC",
            status: "ACTIVE",
            guestQuota: 0,
            validFrom: new Date("2026-01-01T00:00:00.000Z"),
            validUntil: FAR_FUTURE,
          },
        },
      },
    });
    await request(app.getHttpServer())
      .post(`/api/v1/sessions/${sessionId}/notes`)
      .set("X-User-Id", "cn-nobooking")
      .send({ body: "I was not here." })
      .expect(403);
    await prisma.member.deleteMany({ where: { userId: "cn-nobooking" } });
  });

  it("support ticket creation succeeds and requires identity", async () => {
    const created = await request(app.getHttpServer())
      .post("/api/v1/support")
      .set("X-User-Id", memberUser)
      .send({ subject: "Cabin heating", body: "Cabin 3 was cold." })
      .expect(201);
    expect(created.body).toMatchObject({ subject: "Cabin heating", status: "OPEN" });

    await request(app.getHttpServer())
      .post("/api/v1/support")
      .send({ subject: "x", body: "y" })
      .expect(401);
  });
});

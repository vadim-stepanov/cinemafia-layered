import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppModule } from "../src/app.module";
import { configureApp } from "../src/app.setup";
import { PrismaService } from "../src/common/prisma/prisma.service";

describe("Members /me (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const userId = "e2e-pro-user";
  let memberId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);

    const member = await prisma.member.create({
      data: {
        userId,
        displayName: "E2E Pro",
        loyaltyDegree: 6,
        membership: {
          create: {
            tier: "PRO",
            status: "ACTIVE",
            guestQuota: 4,
            validFrom: new Date("2026-01-01T00:00:00.000Z"),
            validUntil: new Date("2999-01-01T00:00:00.000Z"),
          },
        },
      },
    });
    memberId = member.id;
  });

  afterAll(async () => {
    await prisma.member.deleteMany({ where: { id: memberId } });
    await app.close();
  });

  it("returns profile + resolved entitlements for the X-User-Id member", async () => {
    const response = await request(app.getHttpServer())
      .get("/api/v1/me")
      .set("X-User-Id", userId)
      .expect(200);

    expect(response.body).toMatchObject({
      userId,
      displayName: "E2E Pro",
      loyaltyDegree: 6,
      membership: { tier: "PRO", status: "ACTIVE" },
      // PRO base 4 + loyalty bonus min(floor(6/3),3)=2 → 6
      entitlements: { effectiveGuestQuota: 6, discountPercent: 10, canEarlyAccess: true },
    });
  });

  it("401 without identity", async () => {
    await request(app.getHttpServer()).get("/api/v1/me").expect(401);
  });

  it("404 when the user has no member profile", async () => {
    await request(app.getHttpServer())
      .get("/api/v1/me")
      .set("X-User-Id", "nobody-here")
      .expect(404);
  });
});

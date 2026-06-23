import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import { Prisma } from "../../generated/prisma/client";
import { SessionSummaryResponseDto } from "./dto/session-summary.dto";

export const sessionSummarySelect = {
  id: true,
  kind: true,
  startsAt: true,
  endsAt: true,
  earlyAccessUntil: true,
  minLoyaltyDegree: true,
  basePriceStandardCents: true,
  basePriceReclinerCents: true,
  basePricePremiumCents: true,
  cabinPriceCents: true,
  hall: { select: { id: true, name: true } },
  movies: {
    orderBy: { position: "asc" },
    select: { position: true, movie: { select: { id: true, title: true } } },
  },
} satisfies Prisma.SessionSelect;

export const sessionDetailSelect = {
  ...sessionSummarySelect,
  movies: {
    orderBy: { position: "asc" },
    select: {
      position: true,
      movie: {
        select: { id: true, title: true, durationMin: true, releaseYear: true, synopsis: true },
      },
    },
  },
  hall: {
    select: {
      id: true,
      name: true,
      seats: {
        orderBy: [{ rowLabel: "asc" }, { number: "asc" }],
        select: { id: true, rowLabel: true, number: true, tier: true },
      },
      cabins: {
        orderBy: { name: "asc" },
        select: { id: true, name: true, capacity: true },
      },
    },
  },
} satisfies Prisma.SessionSelect;

export type SessionDetail = Prisma.SessionGetPayload<{ select: typeof sessionDetailSelect }>;

@Injectable()
export class CatalogRepository {
  constructor(private readonly prisma: PrismaService) {}

  findManySummaries(where: Prisma.SessionWhereInput): Promise<SessionSummaryResponseDto[]> {
    return this.prisma.session.findMany({
      where,
      orderBy: { startsAt: "asc" },
      select: sessionSummarySelect,
    });
  }

  findDetail(id: string): Promise<SessionDetail | null> {
    return this.prisma.session.findUnique({ where: { id }, select: sessionDetailSelect });
  }

  async findActiveTakenSeatIds(sessionId: string): Promise<string[]> {
    const rows = await this.prisma.bookingSeat.findMany({
      where: { sessionId, active: true },
      select: { seatId: true },
    });
    return rows.map((row) => row.seatId);
  }
}

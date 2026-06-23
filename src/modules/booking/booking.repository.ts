import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import { Prisma, SeatTier } from "../../generated/prisma/client";
import { BookingResponseDto, BookingSummaryResponseDto } from "./dto/booking.dto";

export const bookingDetailSelect = {
  id: true,
  status: true,
  sessionId: true,
  cabinId: true,
  guestCount: true,
  totalPriceCents: true,
  expiresAt: true,
  confirmedAt: true,
  cancelledAt: true,
  createdAt: true,
  seats: {
    where: { active: true },
    select: { seatId: true, seat: { select: { rowLabel: true, number: true, tier: true } } },
  },
  cabin: { select: { id: true, name: true } },
  payment: { select: { status: true, amountCents: true } },
} satisfies Prisma.BookingSelect;

export const bookingSummarySelect = {
  id: true,
  status: true,
  sessionId: true,
  guestCount: true,
  totalPriceCents: true,
  expiresAt: true,
  createdAt: true,
} satisfies Prisma.BookingSelect;

const memberSelect = {
  id: true,
  loyaltyDegree: true,
  membership: { select: { tier: true, status: true } },
} satisfies Prisma.MemberSelect;

const sessionForHoldSelect = {
  id: true,
  startsAt: true,
  minLoyaltyDegree: true,
  earlyAccessUntil: true,
  hallId: true,
  basePriceStandardCents: true,
  basePriceReclinerCents: true,
  basePricePremiumCents: true,
  cabinPriceCents: true,
} satisfies Prisma.SessionSelect;

const bookingControlSelect = {
  id: true,
  status: true,
  expiresAt: true,
  totalPriceCents: true,
  memberId: true,
  sessionId: true,
  member: { select: { userId: true } },
  session: { select: { startsAt: true } },
} satisfies Prisma.BookingSelect;

export type MemberForBooking = Prisma.MemberGetPayload<{ select: typeof memberSelect }>;
export type SessionForHold = Prisma.SessionGetPayload<{ select: typeof sessionForHoldSelect }>;
export type BookingControl = Prisma.BookingGetPayload<{ select: typeof bookingControlSelect }>;

@Injectable()
export class BookingRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMemberByUserId(userId: string): Promise<MemberForBooking | null> {
    return this.prisma.member.findUnique({ where: { userId }, select: memberSelect });
  }

  findSessionForHold(sessionId: string): Promise<SessionForHold | null> {
    return this.prisma.session.findUnique({ where: { id: sessionId }, select: sessionForHoldSelect });
  }

  findSeatsInHall(hallId: string, seatIds: string[]): Promise<{ id: string; tier: SeatTier }[]> {
    return this.prisma.seat.findMany({
      where: { hallId, id: { in: seatIds } },
      select: { id: true, tier: true },
    });
  }

  findCabinInHall(hallId: string, cabinId: string): Promise<{ id: string } | null> {
    return this.prisma.cabin.findFirst({ where: { id: cabinId, hallId }, select: { id: true } });
  }

  findControl(id: string): Promise<BookingControl | null> {
    return this.prisma.booking.findUnique({ where: { id }, select: bookingControlSelect });
  }

  findDetailForUser(id: string, userId: string): Promise<BookingResponseDto | null> {
    return this.prisma.booking.findFirst({
      where: { id, member: { userId } },
      select: bookingDetailSelect,
    });
  }

  findDetail(id: string): Promise<BookingResponseDto | null> {
    return this.prisma.booking.findUnique({ where: { id }, select: bookingDetailSelect });
  }

  listForUser(userId: string): Promise<BookingSummaryResponseDto[]> {
    return this.prisma.booking.findMany({
      where: { member: { userId } },
      orderBy: { createdAt: "desc" },
      select: bookingSummarySelect,
    });
  }
}

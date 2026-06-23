import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { AppConfigService } from "../../common/config/config.service";
import { BOOKING_CONFIRMED, BookingConfirmedEvent } from "../../common/events/booking.events";
import { PaymentService } from "../../common/payment/payment.service";
import { PrismaService } from "../../common/prisma/prisma.service";
import { BookingStatus, PaymentStatus, Prisma, SeatTier } from "../../generated/prisma/client";
import { EntitlementsService } from "../entitlements/entitlements.service";
import { bookingDetailSelect, BookingRepository, SessionForHold } from "./booking.repository";
import { BookingResponseDto, BookingSummaryResponseDto } from "./dto/booking.dto";
import { HoldBookingDto } from "./dto/hold-booking.dto";

@Injectable()
export class BookingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: BookingRepository,
    private readonly entitlements: EntitlementsService,
    private readonly payment: PaymentService,
    private readonly config: AppConfigService,
    private readonly events: EventEmitter2,
  ) {}

  async hold(userId: string, dto: HoldBookingDto): Promise<BookingResponseDto> {
    const seatIds = dto.seatIds ?? [];
    const wantsSeats = seatIds.length > 0;
    const wantsCabin = Boolean(dto.cabinId);
    if (wantsSeats === wantsCabin) {
      throw new BadRequestException("Provide either seatIds or cabinId, not both");
    }

    const member = await this.repo.findMemberByUserId(userId);
    if (!member) {
      throw new NotFoundException(`No member profile for user ${userId}`);
    }

    const session = await this.repo.findSessionForHold(dto.sessionId);
    if (!session) {
      throw new NotFoundException(`Session ${dto.sessionId} not found`);
    }
    const now = new Date();
    if (session.startsAt <= now) {
      throw new ConflictException("Session has already started");
    }

    const entitlements = this.entitlements.resolve(
      member.membership ? { tier: member.membership.tier, status: member.membership.status } : null,
      member.loyaltyDegree,
    );
    const accessible = this.entitlements.canAccessSession(
      member.loyaltyDegree,
      entitlements.canEarlyAccess,
      { minLoyaltyDegree: session.minLoyaltyDegree, earlyAccessUntil: session.earlyAccessUntil },
      now,
    );
    if (!accessible) {
      throw new ForbiddenException("Not eligible for this session");
    }

    const guestCount = dto.guestCount ?? 0;
    if (guestCount > entitlements.effectiveGuestQuota) {
      throw new BadRequestException(
        `Guest count ${guestCount} exceeds quota ${entitlements.effectiveGuestQuota}`,
      );
    }

    const totalPriceCents = wantsSeats
      ? await this.priceSeats(session, seatIds, entitlements.discountPercent)
      : await this.priceCabin(session, dto.cabinId!, entitlements.discountPercent);

    const expiresAt = new Date(now.getTime() + this.config.holdTtlSeconds * 1000);

    try {
      return await this.prisma.booking.create({
        data: {
          memberId: member.id,
          sessionId: session.id,
          cabinId: wantsCabin ? dto.cabinId : null,
          status: BookingStatus.HELD,
          guestCount,
          totalPriceCents,
          expiresAt,
          seats: wantsSeats
            ? { create: seatIds.map((seatId) => ({ sessionId: session.id, seatId })) }
            : undefined,
        },
        select: bookingDetailSelect,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictException("One or more seats (or the cabin) are no longer available");
      }
      throw error;
    }
  }

  async confirm(userId: string, id: string): Promise<BookingResponseDto> {
    const booking = await this.repo.findControl(id);
    if (!booking || booking.member.userId !== userId) {
      throw new NotFoundException(`Booking ${id} not found`);
    }
    if (booking.status === BookingStatus.CONFIRMED) {
      return this.detailOrThrow(id);
    }
    if (booking.status !== BookingStatus.HELD) {
      throw new ConflictException(`Cannot confirm a ${booking.status} booking`);
    }
    if (booking.expiresAt && booking.expiresAt <= new Date()) {
      await this.releaseExpired(id);
      throw new ConflictException("Hold has expired");
    }

    const result = await this.payment.charge(id, booking.totalPriceCents);

    if (result.outcome === "FAILED") {
      await this.prisma.$transaction(async (tx) => {
        await tx.booking.updateMany({
          where: { id, status: BookingStatus.HELD },
          data: { status: BookingStatus.EXPIRED, expiresAt: null },
        });
        await tx.bookingSeat.updateMany({ where: { bookingId: id }, data: { active: false } });
        await tx.payment.upsert({
          where: { bookingId: id },
          create: {
            bookingId: id,
            status: PaymentStatus.FAILED,
            amountCents: booking.totalPriceCents,
            providerRef: result.providerRef,
          },
          update: { status: PaymentStatus.FAILED, providerRef: result.providerRef },
        });
      });
      throw new HttpException("Payment failed", HttpStatus.PAYMENT_REQUIRED);
    }

    await this.prisma.$transaction(async (tx) => {
      const updated = await tx.booking.updateMany({
        where: { id, status: BookingStatus.HELD },
        data: { status: BookingStatus.CONFIRMED, confirmedAt: new Date(), expiresAt: null },
      });
      if (updated.count === 0) {
        throw new ConflictException("Booking is no longer holdable");
      }
      await tx.payment.upsert({
        where: { bookingId: id },
        create: {
          bookingId: id,
          status: PaymentStatus.SUCCEEDED,
          amountCents: booking.totalPriceCents,
          providerRef: result.providerRef,
        },
        update: { status: PaymentStatus.SUCCEEDED, providerRef: result.providerRef },
      });
    });

    // Reaction, not part of the transaction: loyalty accrual + notification.
    this.events.emit(BOOKING_CONFIRMED, {
      bookingId: id,
      memberId: booking.memberId,
      sessionId: booking.sessionId,
    } satisfies BookingConfirmedEvent);

    return this.detailOrThrow(id);
  }

  async cancel(userId: string, id: string): Promise<BookingResponseDto> {
    const booking = await this.repo.findControl(id);
    if (!booking || booking.member.userId !== userId) {
      throw new NotFoundException(`Booking ${id} not found`);
    }
    if (booking.status === BookingStatus.CANCELLED) {
      return this.detailOrThrow(id);
    }
    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new ConflictException(`Cannot cancel a ${booking.status} booking`);
    }
    const now = new Date();
    if (now >= booking.session.startsAt) {
      throw new ConflictException("Cannot cancel after the session has started");
    }

    const refundCents = this.computeRefund(now, booking.session.startsAt, booking.totalPriceCents);
    await this.payment.refund(id, refundCents);

    await this.prisma.$transaction(async (tx) => {
      const updated = await tx.booking.updateMany({
        where: { id, status: BookingStatus.CONFIRMED },
        data: { status: BookingStatus.CANCELLED, cancelledAt: now },
      });
      if (updated.count === 0) {
        throw new ConflictException("Booking is no longer cancellable");
      }
      await tx.bookingSeat.updateMany({ where: { bookingId: id }, data: { active: false } });
      await tx.payment.updateMany({
        where: { bookingId: id },
        data: { status: PaymentStatus.REFUNDED },
      });
    });

    return this.detailOrThrow(id);
  }

  async getForUser(userId: string, id: string): Promise<BookingResponseDto> {
    const booking = await this.repo.findDetailForUser(id, userId);
    if (!booking) {
      throw new NotFoundException(`Booking ${id} not found`);
    }
    return booking;
  }

  listForUser(userId: string): Promise<BookingSummaryResponseDto[]> {
    return this.repo.listForUser(userId);
  }

  private async priceSeats(
    session: SessionForHold,
    seatIds: string[],
    discountPercent: number,
  ): Promise<number> {
    const seats = await this.repo.findSeatsInHall(session.hallId, seatIds);
    if (seats.length !== seatIds.length) {
      throw new BadRequestException("One or more seats do not belong to this session's hall");
    }
    const tierPrice: Record<SeatTier, number> = {
      STANDARD: session.basePriceStandardCents,
      RECLINER: session.basePriceReclinerCents,
      PREMIUM: session.basePricePremiumCents,
    };
    const base = seats.reduce((sum, seat) => sum + tierPrice[seat.tier], 0);
    return this.applyDiscount(base, discountPercent);
  }

  private async priceCabin(
    session: SessionForHold,
    cabinId: string,
    discountPercent: number,
  ): Promise<number> {
    const cabin = await this.repo.findCabinInHall(session.hallId, cabinId);
    if (!cabin) {
      throw new BadRequestException("Cabin does not belong to this session's hall");
    }
    return this.applyDiscount(session.cabinPriceCents, discountPercent);
  }

  private applyDiscount(baseCents: number, discountPercent: number): number {
    return baseCents - Math.floor((baseCents * discountPercent) / 100);
  }

  private computeRefund(now: Date, startsAt: Date, totalCents: number): number {
    const hoursBefore = (startsAt.getTime() - now.getTime()) / (1000 * 60 * 60);
    if (hoursBefore >= this.config.refundWindowHours) {
      return totalCents;
    }
    return Math.floor((totalCents * this.config.partialRefundPercent) / 100);
  }

  private async releaseExpired(id: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.booking.updateMany({
        where: { id, status: BookingStatus.HELD },
        data: { status: BookingStatus.EXPIRED, expiresAt: null },
      });
      await tx.bookingSeat.updateMany({ where: { bookingId: id }, data: { active: false } });
    });
  }

  private async detailOrThrow(id: string): Promise<BookingResponseDto> {
    const detail = await this.repo.findDetail(id);
    if (!detail) {
      throw new NotFoundException(`Booking ${id} not found`);
    }
    return detail;
  }
}

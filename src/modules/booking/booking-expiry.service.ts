import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../../common/prisma/prisma.service";
import { BookingStatus } from "../../generated/prisma/client";

@Injectable()
export class BookingExpiryService {
  private readonly logger = new Logger(BookingExpiryService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_30_SECONDS)
  async handleExpirySweep(): Promise<void> {
    const expired = await this.sweepExpiredHolds();
    if (expired > 0) {
      this.logger.log(`Expired ${expired} stale hold(s)`);
    }
  }

  /** HELD → EXPIRED for holds past their TTL; releases their captured seats. */
  async sweepExpiredHolds(now: Date = new Date()): Promise<number> {
    const stale = await this.prisma.booking.findMany({
      where: { status: BookingStatus.HELD, expiresAt: { lte: now } },
      select: { id: true },
    });
    if (stale.length === 0) {
      return 0;
    }

    const ids = stale.map((booking) => booking.id);
    await this.prisma.$transaction(async (tx) => {
      await tx.booking.updateMany({
        where: { id: { in: ids }, status: BookingStatus.HELD },
        data: { status: BookingStatus.EXPIRED, expiresAt: null },
      });
      await tx.bookingSeat.updateMany({
        where: { bookingId: { in: ids } },
        data: { active: false },
      });
    });
    return ids.length;
  }
}

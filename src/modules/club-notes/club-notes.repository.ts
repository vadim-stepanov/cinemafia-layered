import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import { BookingStatus, MembershipStatus, Prisma } from "../../generated/prisma/client";
import { ClubNoteResponseDto } from "./dto/club-note.dto";

export const clubNoteSelect = {
  id: true,
  body: true,
  createdAt: true,
  member: { select: { displayName: true } },
} satisfies Prisma.ClubNoteSelect;

@Injectable()
export class ClubNotesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMemberWithMembership(
    userId: string,
  ): Promise<{ id: string; membership: { status: MembershipStatus } | null } | null> {
    return this.prisma.member.findUnique({
      where: { userId },
      select: { id: true, membership: { select: { status: true } } },
    });
  }

  async sessionExists(sessionId: string): Promise<boolean> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      select: { id: true },
    });
    return session !== null;
  }

  async hasConfirmedBooking(memberId: string, sessionId: string): Promise<boolean> {
    const booking = await this.prisma.booking.findFirst({
      where: { memberId, sessionId, status: BookingStatus.CONFIRMED },
      select: { id: true },
    });
    return booking !== null;
  }

  listForSession(sessionId: string): Promise<ClubNoteResponseDto[]> {
    return this.prisma.clubNote.findMany({
      where: { sessionId },
      orderBy: { createdAt: "desc" },
      select: clubNoteSelect,
    });
  }

  create(memberId: string, sessionId: string, body: string): Promise<ClubNoteResponseDto> {
    return this.prisma.clubNote.create({
      data: { memberId, sessionId, body },
      select: clubNoteSelect,
    });
  }
}

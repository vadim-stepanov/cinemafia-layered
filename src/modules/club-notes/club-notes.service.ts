import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { MembershipStatus } from "../../generated/prisma/client";
import { ClubNotesRepository } from "./club-notes.repository";
import { ClubNoteResponseDto } from "./dto/club-note.dto";
import { CreateClubNoteDto } from "./dto/create-club-note.dto";

@Injectable()
export class ClubNotesService {
  constructor(private readonly repo: ClubNotesRepository) {}

  async listNotes(userId: string, sessionId: string): Promise<ClubNoteResponseDto[]> {
    await this.requireActiveMember(userId);
    if (!(await this.repo.sessionExists(sessionId))) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }
    return this.repo.listForSession(sessionId);
  }

  async createNote(
    userId: string,
    sessionId: string,
    dto: CreateClubNoteDto,
  ): Promise<ClubNoteResponseDto> {
    const memberId = await this.requireActiveMember(userId);
    if (!(await this.repo.sessionExists(sessionId))) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }
    if (!(await this.repo.hasConfirmedBooking(memberId, sessionId))) {
      throw new ForbiddenException("You can only note sessions you have booked");
    }
    return this.repo.create(memberId, sessionId, dto.body);
  }

  private async requireActiveMember(userId: string): Promise<string> {
    const member = await this.repo.findMemberWithMembership(userId);
    if (!member || member.membership?.status !== MembershipStatus.ACTIVE) {
      throw new ForbiddenException("Club Notes are members-only (active membership required)");
    }
    return member.id;
  }
}

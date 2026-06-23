import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "../../generated/prisma/client";
import { CatalogRepository } from "./catalog.repository";
import { ListSessionsQueryDto } from "./dto/list-sessions.query.dto";
import { SessionDetailResponseDto } from "./dto/session-detail.dto";
import { SessionSummaryResponseDto } from "./dto/session-summary.dto";

@Injectable()
export class CatalogService {
  constructor(private readonly repo: CatalogRepository) {}

  listSessions(query: ListSessionsQueryDto): Promise<SessionSummaryResponseDto[]> {
    const where: Prisma.SessionWhereInput = {};
    if (query.kind) {
      where.kind = query.kind;
    }
    if (query.from || query.to) {
      where.startsAt = {
        ...(query.from ? { gte: new Date(query.from) } : {}),
        ...(query.to ? { lte: new Date(query.to) } : {}),
      };
    }
    return this.repo.findManySummaries(where);
  }

  async getSession(id: string): Promise<SessionDetailResponseDto> {
    const session = await this.repo.findDetail(id);
    if (!session) {
      throw new NotFoundException(`Session ${id} not found`);
    }
    const takenSeatIds = await this.repo.findActiveTakenSeatIds(id);
    return { ...session, takenSeatIds };
  }
}

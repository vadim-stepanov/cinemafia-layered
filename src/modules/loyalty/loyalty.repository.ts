import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";

@Injectable()
export class LoyaltyRepository {
  constructor(private readonly prisma: PrismaService) {}

  async incrementDegree(memberId: string, by: number): Promise<void> {
    await this.prisma.member.update({
      where: { id: memberId },
      data: { loyaltyDegree: { increment: by } },
    });
  }
}

import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import { Prisma } from "../../generated/prisma/client";

export const memberWithMembershipSelect = {
  id: true,
  userId: true,
  displayName: true,
  loyaltyDegree: true,
  membership: { select: { tier: true, status: true, validUntil: true } },
} satisfies Prisma.MemberSelect;

export type MemberWithMembership = Prisma.MemberGetPayload<{
  select: typeof memberWithMembershipSelect;
}>;

@Injectable()
export class MembersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByUserId(userId: string): Promise<MemberWithMembership | null> {
    return this.prisma.member.findUnique({
      where: { userId },
      select: memberWithMembershipSelect,
    });
  }
}

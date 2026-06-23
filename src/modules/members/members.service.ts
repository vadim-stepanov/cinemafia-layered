import { Injectable, NotFoundException } from "@nestjs/common";
import { EntitlementsService } from "../entitlements/entitlements.service";
import { MembersRepository } from "./members.repository";
import { MeResponseDto } from "./dto/me.dto";

@Injectable()
export class MembersService {
  constructor(
    private readonly repo: MembersRepository,
    private readonly entitlements: EntitlementsService,
  ) {}

  async getMe(userId: string): Promise<MeResponseDto> {
    const member = await this.repo.findByUserId(userId);
    if (!member) {
      throw new NotFoundException(`No member profile for user ${userId}`);
    }

    const membership = member.membership;
    const entitlements = this.entitlements.resolve(
      membership ? { tier: membership.tier, status: membership.status } : null,
      member.loyaltyDegree,
    );

    return {
      userId: member.userId,
      displayName: member.displayName,
      loyaltyDegree: member.loyaltyDegree,
      membership: membership
        ? {
            tier: membership.tier,
            status: membership.status,
            validUntil: membership.validUntil,
          }
        : null,
      entitlements,
    };
  }
}

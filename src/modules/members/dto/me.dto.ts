import { Expose, Type } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";
import { MembershipStatus, MembershipTier } from "../../../generated/prisma/client";

export class MembershipDto {
  @Expose()
  @ApiProperty({ enum: MembershipTier })
  tier!: MembershipTier;

  @Expose()
  @ApiProperty({ enum: MembershipStatus })
  status!: MembershipStatus;

  @Expose()
  @ApiProperty({ type: String, format: "date-time" })
  validUntil!: Date;
}

export class EntitlementsDto {
  @Expose()
  @ApiProperty({ description: "base(tier) + loyalty bonus." })
  effectiveGuestQuota!: number;

  @Expose()
  @ApiProperty()
  discountPercent!: number;

  @Expose()
  @ApiProperty()
  canEarlyAccess!: boolean;
}

export class MeResponseDto {
  @Expose()
  @ApiProperty()
  userId!: string;

  @Expose()
  @ApiProperty()
  displayName!: string;

  @Expose()
  @ApiProperty()
  loyaltyDegree!: number;

  @Expose()
  @Type(() => MembershipDto)
  @ApiProperty({ type: MembershipDto, nullable: true })
  membership!: MembershipDto | null;

  @Expose()
  @Type(() => EntitlementsDto)
  @ApiProperty({ type: EntitlementsDto })
  entitlements!: EntitlementsDto;
}

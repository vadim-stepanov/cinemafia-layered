import { Expose, Type } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";
import { SessionKind } from "../../../generated/prisma/client";

export class MovieRefDto {
  @Expose()
  @ApiProperty()
  id!: string;

  @Expose()
  @ApiProperty()
  title!: string;
}

export class SessionMovieSummaryDto {
  @Expose()
  @ApiProperty({ description: "Order of the movie within the session bundle." })
  position!: number;

  @Expose()
  @Type(() => MovieRefDto)
  @ApiProperty({ type: MovieRefDto })
  movie!: MovieRefDto;
}

export class HallRefDto {
  @Expose()
  @ApiProperty()
  id!: string;

  @Expose()
  @ApiProperty()
  name!: string;
}

export class SessionSummaryResponseDto {
  @Expose()
  @ApiProperty()
  id!: string;

  @Expose()
  @ApiProperty({ enum: SessionKind })
  kind!: SessionKind;

  @Expose()
  @ApiProperty({ type: String, format: "date-time" })
  startsAt!: Date;

  @Expose()
  @ApiProperty({ type: String, format: "date-time" })
  endsAt!: Date;

  @Expose()
  @ApiProperty({ type: String, format: "date-time", nullable: true })
  earlyAccessUntil!: Date | null;

  @Expose()
  @ApiProperty({ description: "Minimum loyalty degree required to access the session." })
  minLoyaltyDegree!: number;

  @Expose()
  @ApiProperty()
  basePriceStandardCents!: number;

  @Expose()
  @ApiProperty()
  basePriceReclinerCents!: number;

  @Expose()
  @ApiProperty()
  basePricePremiumCents!: number;

  @Expose()
  @ApiProperty()
  cabinPriceCents!: number;

  @Expose()
  @Type(() => HallRefDto)
  @ApiProperty({ type: HallRefDto })
  hall!: HallRefDto;

  @Expose()
  @Type(() => SessionMovieSummaryDto)
  @ApiProperty({ type: SessionMovieSummaryDto, isArray: true })
  movies!: SessionMovieSummaryDto[];
}

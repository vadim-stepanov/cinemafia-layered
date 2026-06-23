import { Expose, Type } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";
import { SeatTier, SessionKind } from "../../../generated/prisma/client";

export class MovieDto {
  @Expose()
  @ApiProperty()
  id!: string;

  @Expose()
  @ApiProperty()
  title!: string;

  @Expose()
  @ApiProperty()
  durationMin!: number;

  @Expose()
  @ApiProperty({ type: Number, nullable: true })
  releaseYear!: number | null;

  @Expose()
  @ApiProperty({ type: String, nullable: true })
  synopsis!: string | null;
}

export class SessionMovieDto {
  @Expose()
  @ApiProperty()
  position!: number;

  @Expose()
  @Type(() => MovieDto)
  @ApiProperty({ type: MovieDto })
  movie!: MovieDto;
}

export class SeatDto {
  @Expose()
  @ApiProperty()
  id!: string;

  @Expose()
  @ApiProperty()
  rowLabel!: string;

  @Expose()
  @ApiProperty()
  number!: number;

  @Expose()
  @ApiProperty({ enum: SeatTier })
  tier!: SeatTier;
}

export class CabinDto {
  @Expose()
  @ApiProperty()
  id!: string;

  @Expose()
  @ApiProperty()
  name!: string;

  @Expose()
  @ApiProperty()
  capacity!: number;
}

export class HallDto {
  @Expose()
  @ApiProperty()
  id!: string;

  @Expose()
  @ApiProperty()
  name!: string;

  @Expose()
  @Type(() => SeatDto)
  @ApiProperty({ type: SeatDto, isArray: true })
  seats!: SeatDto[];

  @Expose()
  @Type(() => CabinDto)
  @ApiProperty({ type: CabinDto, isArray: true })
  cabins!: CabinDto[];
}

export class SessionDetailResponseDto {
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
  @ApiProperty()
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
  @Type(() => HallDto)
  @ApiProperty({ type: HallDto })
  hall!: HallDto;

  @Expose()
  @Type(() => SessionMovieDto)
  @ApiProperty({ type: SessionMovieDto, isArray: true })
  movies!: SessionMovieDto[];

  @Expose()
  @ApiProperty({ type: String, isArray: true, description: "Seat ids currently held or confirmed." })
  takenSeatIds!: string[];
}

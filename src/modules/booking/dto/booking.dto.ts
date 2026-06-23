import { Expose, Type } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";
import { BookingStatus, PaymentStatus, SeatTier } from "../../../generated/prisma/client";

export class BookingSeatRefDto {
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

export class BookingSeatDto {
  @Expose()
  @ApiProperty()
  seatId!: string;

  @Expose()
  @Type(() => BookingSeatRefDto)
  @ApiProperty({ type: BookingSeatRefDto })
  seat!: BookingSeatRefDto;
}

export class BookingCabinRefDto {
  @Expose()
  @ApiProperty()
  id!: string;

  @Expose()
  @ApiProperty()
  name!: string;
}

export class BookingPaymentDto {
  @Expose()
  @ApiProperty({ enum: PaymentStatus })
  status!: PaymentStatus;

  @Expose()
  @ApiProperty()
  amountCents!: number;
}

export class BookingResponseDto {
  @Expose()
  @ApiProperty()
  id!: string;

  @Expose()
  @ApiProperty({ enum: BookingStatus })
  status!: BookingStatus;

  @Expose()
  @ApiProperty()
  sessionId!: string;

  @Expose()
  @ApiProperty({ type: String, nullable: true })
  cabinId!: string | null;

  @Expose()
  @ApiProperty()
  guestCount!: number;

  @Expose()
  @ApiProperty()
  totalPriceCents!: number;

  @Expose()
  @ApiProperty({ type: String, format: "date-time", nullable: true })
  expiresAt!: Date | null;

  @Expose()
  @ApiProperty({ type: String, format: "date-time", nullable: true })
  confirmedAt!: Date | null;

  @Expose()
  @ApiProperty({ type: String, format: "date-time", nullable: true })
  cancelledAt!: Date | null;

  @Expose()
  @ApiProperty({ type: String, format: "date-time" })
  createdAt!: Date;

  @Expose()
  @Type(() => BookingSeatDto)
  @ApiProperty({ type: BookingSeatDto, isArray: true })
  seats!: BookingSeatDto[];

  @Expose()
  @Type(() => BookingCabinRefDto)
  @ApiProperty({ type: BookingCabinRefDto, nullable: true })
  cabin!: BookingCabinRefDto | null;

  @Expose()
  @Type(() => BookingPaymentDto)
  @ApiProperty({ type: BookingPaymentDto, nullable: true })
  payment!: BookingPaymentDto | null;
}

export class BookingSummaryResponseDto {
  @Expose()
  @ApiProperty()
  id!: string;

  @Expose()
  @ApiProperty({ enum: BookingStatus })
  status!: BookingStatus;

  @Expose()
  @ApiProperty()
  sessionId!: string;

  @Expose()
  @ApiProperty()
  guestCount!: number;

  @Expose()
  @ApiProperty()
  totalPriceCents!: number;

  @Expose()
  @ApiProperty({ type: String, format: "date-time", nullable: true })
  expiresAt!: Date | null;

  @Expose()
  @ApiProperty({ type: String, format: "date-time" })
  createdAt!: Date;
}

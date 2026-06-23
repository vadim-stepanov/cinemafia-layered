import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from "class-validator";

export class HoldBookingDto {
  @ApiProperty()
  @IsString()
  sessionId!: string;

  @ApiPropertyOptional({ type: String, isArray: true, description: "Seat ids to hold (mutually exclusive with cabinId)." })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  seatIds?: string[];

  @ApiPropertyOptional({ description: "Cabin id to hold (mutually exclusive with seatIds)." })
  @IsOptional()
  @IsString()
  cabinId?: string;

  @ApiPropertyOptional({ description: "Guests to bring (must fit the effective guest quota).", minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  guestCount?: number;
}

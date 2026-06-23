import { Expose } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";
import { SupportTicketStatus } from "../../../generated/prisma/client";

export class SupportTicketResponseDto {
  @Expose()
  @ApiProperty()
  id!: string;

  @Expose()
  @ApiProperty()
  subject!: string;

  @Expose()
  @ApiProperty()
  body!: string;

  @Expose()
  @ApiProperty({ enum: SupportTicketStatus })
  status!: SupportTicketStatus;

  @Expose()
  @ApiProperty({ type: String, format: "date-time" })
  createdAt!: Date;
}

import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsISO8601, IsOptional } from "class-validator";
import { SessionKind } from "../../../generated/prisma/client";

export class ListSessionsQueryDto {
  @ApiPropertyOptional({ enum: SessionKind, description: "Filter by session kind." })
  @IsOptional()
  @IsEnum(SessionKind)
  kind?: SessionKind;

  @ApiPropertyOptional({ description: "ISO 8601 — only sessions starting at or after this instant." })
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional({ description: "ISO 8601 — only sessions starting at or before this instant." })
  @IsOptional()
  @IsISO8601()
  to?: string;
}

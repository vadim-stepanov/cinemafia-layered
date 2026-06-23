import { Expose, Type } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";

export class ClubNoteAuthorDto {
  @Expose()
  @ApiProperty()
  displayName!: string;
}

export class ClubNoteResponseDto {
  @Expose()
  @ApiProperty()
  id!: string;

  @Expose()
  @ApiProperty()
  body!: string;

  @Expose()
  @ApiProperty({ type: String, format: "date-time" })
  createdAt!: Date;

  @Expose()
  @Type(() => ClubNoteAuthorDto)
  @ApiProperty({ type: ClubNoteAuthorDto })
  member!: ClubNoteAuthorDto;
}

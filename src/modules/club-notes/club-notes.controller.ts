import { Body, Controller, Get, Param, Post, SerializeOptions } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiSecurity,
  ApiTags,
} from "@nestjs/swagger";
import { CurrentUserId } from "../../common/auth/current-user.decorator";
import { ClubNotesService } from "./club-notes.service";
import { ClubNoteResponseDto } from "./dto/club-note.dto";
import { CreateClubNoteDto } from "./dto/create-club-note.dto";

@ApiTags("club-notes")
@ApiBearerAuth()
@ApiSecurity("X-User-Id")
@ApiForbiddenResponse({ description: "Active membership (and a booking, to post) required." })
@SerializeOptions({ type: ClubNoteResponseDto, excludeExtraneousValues: true })
@Controller("sessions/:sessionId/notes")
export class ClubNotesController {
  constructor(private readonly notes: ClubNotesService) {}

  @Get()
  @ApiOkResponse({ type: ClubNoteResponseDto, isArray: true })
  list(
    @CurrentUserId() userId: string,
    @Param("sessionId") sessionId: string,
  ): Promise<ClubNoteResponseDto[]> {
    return this.notes.listNotes(userId, sessionId);
  }

  @Post()
  @ApiCreatedResponse({ type: ClubNoteResponseDto })
  create(
    @CurrentUserId() userId: string,
    @Param("sessionId") sessionId: string,
    @Body() dto: CreateClubNoteDto,
  ): Promise<ClubNoteResponseDto> {
    return this.notes.createNote(userId, sessionId, dto);
  }
}

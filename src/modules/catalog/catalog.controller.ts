import { Controller, Get, Param, Query, SerializeOptions } from "@nestjs/common";
import { ApiNotFoundResponse, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { Public } from "../../common/auth/public.decorator";
import { CatalogService } from "./catalog.service";
import { ListSessionsQueryDto } from "./dto/list-sessions.query.dto";
import { SessionDetailResponseDto } from "./dto/session-detail.dto";
import { SessionSummaryResponseDto } from "./dto/session-summary.dto";

@ApiTags("catalog")
@Public()
@Controller("sessions")
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get()
  @SerializeOptions({ type: SessionSummaryResponseDto, excludeExtraneousValues: true })
  @ApiOkResponse({ type: SessionSummaryResponseDto, isArray: true })
  listSessions(@Query() query: ListSessionsQueryDto): Promise<SessionSummaryResponseDto[]> {
    return this.catalog.listSessions(query);
  }

  @Get(":id")
  @SerializeOptions({ type: SessionDetailResponseDto, excludeExtraneousValues: true })
  @ApiOkResponse({ type: SessionDetailResponseDto })
  @ApiNotFoundResponse({ description: "Session not found." })
  getSession(@Param("id") id: string): Promise<SessionDetailResponseDto> {
    return this.catalog.getSession(id);
  }
}
